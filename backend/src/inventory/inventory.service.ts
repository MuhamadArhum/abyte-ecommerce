import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, lowStockOnly = false) {
    if (!lowStockOnly) {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.inventory.findMany({
          include: { product: { select: { id: true, name: true, sku: true, slug: true } } },
          skip: pagination.skip,
          take: pagination.limit,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.inventory.count(),
      ]);
      return {
        items,
        meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
      };
    }

    // Prisma cannot compare two columns directly in a where clause, so the
    // full set is fetched and filtered before pagination is applied in-memory.
    const all = await this.prisma.inventory.findMany({
      include: { product: { select: { id: true, name: true, sku: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const filtered = all.filter((i) => i.quantity <= i.lowStockThreshold);
    const page = filtered.slice(pagination.skip, pagination.skip + pagination.limit);
    return {
      items: page,
      meta: {
        total: filtered.length,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(filtered.length / pagination.limit) || 1,
      },
    };
  }

  async findByProduct(productId: number) {
    const inventory = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw new NotFoundException('Inventory record not found for product');
    return inventory;
  }

  async getTransactions(productId: number, pagination: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
        include: { performedBy: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.inventoryTransaction.count({ where: { productId } }),
    ]);
    return {
      items,
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
    };
  }

  /**
   * Adjust stock manually (restock, correction, return). Uses an atomic
   * conditional update so concurrent adjustments never push quantity negative.
   */
  async adjustStock(
    productId: number,
    quantity: number,
    type: InventoryTransactionType,
    reason: string | undefined,
    performedById: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { productId } });
      if (!inventory) throw new NotFoundException('Inventory record not found for product');

      if (quantity < 0 && inventory.quantity + quantity < 0) {
        throw new BadRequestException('Resulting stock cannot be negative');
      }

      const updated = await tx.inventory.update({
        where: { productId },
        data: { quantity: { increment: quantity } },
      });

      await tx.inventoryTransaction.create({
        data: { productId, type, quantity, reason, performedById },
      });

      return updated;
    });
  }

  async updateThreshold(productId: number, lowStockThreshold: number) {
    await this.findByProduct(productId);
    return this.prisma.inventory.update({ where: { productId }, data: { lowStockThreshold } });
  }

  /**
   * Atomically reserve stock for a set of items inside an existing transaction
   * client. Throws if any item does not have sufficient available stock.
   * Available stock = quantity - reserved.
   */
  async reserveStockTx(
    tx: Prisma.TransactionClient,
    items: { productId: number; quantity: number }[],
  ) {
    for (const item of items) {
      const result = await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          quantity: { gte: item.quantity },
        },
        data: { quantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}`,
        );
      }
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: InventoryTransactionType.SALE,
          quantity: -item.quantity,
          reason: 'Order placed',
        },
      });
    }
  }

  async restockFromCancelledOrderTx(
    tx: Prisma.TransactionClient,
    orderId: number,
    items: { productId: number; quantity: number }[],
  ) {
    for (const item of items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: InventoryTransactionType.RETURN,
          quantity: item.quantity,
          reason: 'Order cancelled',
          orderId,
        },
      });
    }
  }
}
