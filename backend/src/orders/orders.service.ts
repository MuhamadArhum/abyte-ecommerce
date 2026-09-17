import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, PaymentMethod, ProductStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

const FLAT_SHIPPING_FEE = 10;
const FREE_SHIPPING_THRESHOLD = 100;
const TAX_RATE = 0; // configurable per jurisdiction; kept at 0 as no tax jurisdiction was specified

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

const ORDER_INCLUDE = {
  items: { include: { product: { select: { name: true, slug: true } } } },
  payments: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
  billingAddress: true,
  coupon: { select: { code: true } },
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }

  async checkout(userId: number, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: { include: { inventory: true } }, variant: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const shippingAddress = await this.prisma.address.findUnique({ where: { id: dto.shippingAddressId } });
    const billingAddress = await this.prisma.address.findUnique({ where: { id: dto.billingAddressId } });
    if (!shippingAddress || shippingAddress.userId !== userId) {
      throw new ForbiddenException('Invalid shipping address');
    }
    if (!billingAddress || billingAddress.userId !== userId) {
      throw new ForbiddenException('Invalid billing address');
    }

    const toSnapshot = (addr: typeof shippingAddress) => ({
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
    });

    // Server-side re-validation: never trust cached prices or client totals.
    let subtotal = 0;
    const orderItemsData: {
      productId: number;
      variantId: number | null;
      nameSnapshot: string;
      skuSnapshot: string;
      priceSnapshot: number;
      quantity: number;
      lineTotal: number;
    }[] = [];
    const stockRequests: { productId: number; quantity: number }[] = [];

    for (const item of cart.items) {
      if (item.product.status !== ProductStatus.PUBLISHED) {
        throw new BadRequestException(`"${item.product.name}" is no longer available`);
      }
      const availableStock = item.variant ? item.variant.stock : item.product.inventory?.quantity ?? 0;
      if (item.quantity > availableStock) {
        throw new BadRequestException(`Insufficient stock for "${item.product.name}"`);
      }
      const unitPrice = item.variant?.priceOverride
        ? Number(item.variant.priceOverride)
        : item.product.discountPrice
          ? Number(item.product.discountPrice)
          : Number(item.product.price);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId,
        nameSnapshot: item.product.name + (item.variant ? ` (${item.variant.name})` : ''),
        skuSnapshot: item.variant?.sku ?? item.product.sku,
        priceSnapshot: unitPrice,
        quantity: item.quantity,
        lineTotal,
      });

      // Variant stock decrements are handled separately below since
      // InventoryService.reserveStockTx only tracks product-level stock.
      if (!item.variant) {
        stockRequests.push({ productId: item.productId, quantity: item.quantity });
      }
    }
    subtotal = Math.round(subtotal * 100) / 100;

    let discountTotal = 0;
    let appliedCoupon: { id: number; code: string } | null = null;
    if (dto.couponCode) {
      const productIds = cart.items.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true },
      });
      const categoryIds = products.map((p) => p.categoryId).filter((id): id is number => id !== null);
      const { coupon, discount } = await this.couponsService.validateAndCompute(
        dto.couponCode,
        userId,
        subtotal,
        productIds,
        categoryIds,
      );
      discountTotal = discount;
      appliedCoupon = { id: coupon.id, code: coupon.code };
    }

    const taxableAmount = subtotal - discountTotal;
    const taxTotal = Math.round(taxableAmount * TAX_RATE * 100) / 100;
    const shippingTotal = taxableAmount >= FREE_SHIPPING_THRESHOLD || taxableAmount <= 0 ? 0 : FLAT_SHIPPING_FEE;
    const grandTotal = Math.round((taxableAmount + taxTotal + shippingTotal) * 100) / 100;

    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct product-level stock atomically; throws if insufficient.
      if (stockRequests.length > 0) {
        await this.inventoryService.reserveStockTx(tx, stockRequests);
      }
      // Variant stock is decremented directly since it lives on ProductVariant.
      for (const item of cart.items) {
        if (item.variant) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.variant.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new BadRequestException(`Insufficient stock for "${item.product.name}"`);
          }
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          paymentStatus: dto.paymentMethod === PaymentMethod.COD ? PaymentStatus.UNPAID : PaymentStatus.PAID,
          paymentMethod: dto.paymentMethod,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          shippingSnapshot: toSnapshot(shippingAddress) as Prisma.InputJsonValue,
          billingSnapshot: toSnapshot(billingAddress) as Prisma.InputJsonValue,
          subtotal,
          discountTotal,
          shippingTotal,
          taxTotal,
          grandTotal,
          couponId: appliedCoupon?.id,
          items: { create: orderItemsData },
          statusHistory: { create: { status: OrderStatus.PENDING, note: 'Order placed' } },
          payments: {
            create: {
              method: dto.paymentMethod,
              status: dto.paymentMethod === PaymentMethod.COD ? PaymentStatus.UNPAID : PaymentStatus.PAID,
              amount: grandTotal,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      if (appliedCoupon) {
        await tx.couponUsage.create({
          data: { couponId: appliedCoupon.id, userId, orderId: created.id },
        });
        await tx.coupon.update({ where: { id: appliedCoupon.id }, data: { usageCount: { increment: 1 } } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    await this.notificationsService.create(
      userId,
      'ORDER_STATUS',
      'Order placed',
      `Your order ${order.orderNumber} has been placed and is pending confirmation.`,
    );

    return order;
  }

  async findAllForUser(userId: number, query: QueryOrdersDto) {
    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) || 1 },
    };
  }

  async findAllAdmin(query: QueryOrdersDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { ...ORDER_INCLUDE, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) || 1 },
    };
  }

  async findOne(id: number, requestingUserId: number, isAdmin: boolean) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { ...ORDER_INCLUDE, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin && order.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  async updateStatus(id: number, newStatus: OrderStatus, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition order from ${order.status} to ${newStatus}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (newStatus === OrderStatus.CANCELLED) {
        const restockItems = order.items
          .filter((i) => !i.variantId)
          .map((i) => ({ productId: i.productId, quantity: i.quantity }));
        if (restockItems.length > 0) {
          await this.inventoryService.restockFromCancelledOrderTx(tx, order.id, restockItems);
        }
        for (const item of order.items.filter((i) => i.variantId)) {
          await tx.productVariant.update({
            where: { id: item.variantId! },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === OrderStatus.CANCELLED
            ? { cancelledAt: new Date(), cancelReason: note }
            : {}),
          ...(newStatus === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.COD
            ? { paymentStatus: PaymentStatus.PAID }
            : {}),
          statusHistory: { create: { status: newStatus, note } },
        },
        include: ORDER_INCLUDE,
      });
    });

    await this.notificationsService.create(
      order.userId,
      'ORDER_STATUS',
      `Order ${updated.orderNumber} ${newStatus.toLowerCase()}`,
      note || `Your order status changed to ${newStatus}.`,
    );

    return updated;
  }

  async cancelByCustomer(id: number, userId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You do not have access to this order');
    const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('This order can no longer be cancelled; please contact support');
    }
    return this.updateStatus(id, OrderStatus.CANCELLED, reason ?? 'Cancelled by customer');
  }
}
