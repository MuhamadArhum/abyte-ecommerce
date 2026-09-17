import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        include: { images: { where: { isPrimary: true }, take: 1 }, inventory: true },
      },
      variant: true,
    },
  },
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: number) {
    let cart = await this.prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId }, include: CART_INCLUDE });
    }
    return cart;
  }

  private computeTotals(cart: Awaited<ReturnType<typeof this.getOrCreateCart>>) {
    let subtotal = 0;
    const items = cart.items.map((item) => {
      const unitPrice = item.variant?.priceOverride
        ? Number(item.variant.priceOverride)
        : item.product.discountPrice
          ? Number(item.product.discountPrice)
          : Number(item.product.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      const availableStock = item.variant ? item.variant.stock : item.product.inventory?.quantity ?? 0;
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0]?.url ?? null,
        variantName: item.variant?.name ?? null,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        availableStock,
        inStock: availableStock >= item.quantity,
      };
    });
    return { items, subtotal };
  }

  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    return this.computeTotals(cart);
  }

  async addItem(userId: number, productId: number, variantId: number | undefined, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true, variants: true },
    });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found or unavailable');
    }

    let availableStock = product.inventory?.quantity ?? 0;
    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) throw new NotFoundException('Product variant not found');
      availableStock = variant.stock;
    }

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find((i) => i.productId === productId && i.variantId === (variantId ?? null));
    const newQuantity = (existing?.quantity ?? 0) + quantity;

    if (newQuantity > availableStock) {
      throw new BadRequestException(`Only ${availableStock} unit(s) available in stock`);
    }

    if (existing) {
      await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId, quantity },
      });
    }
    return this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    const availableStock = item.variant ? item.variant.stock : item.product.inventory?.quantity ?? 0;
    if (quantity > availableStock) {
      throw new BadRequestException(`Only ${availableStock} unit(s) available in stock`);
    }

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clear(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }
}
