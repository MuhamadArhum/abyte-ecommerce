import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WISHLIST_INCLUDE = {
  items: {
    include: {
      product: {
        include: { images: { where: { isPrimary: true }, take: 1 }, inventory: true },
      },
    },
  },
};

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreate(userId: number) {
    let wishlist = await this.prisma.wishlist.findUnique({ where: { userId }, include: WISHLIST_INCLUDE });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({ data: { userId }, include: WISHLIST_INCLUDE });
    }
    return wishlist;
  }

  async findMine(userId: number) {
    return this.getOrCreate(userId);
  }

  async addItem(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found or unavailable');
    }
    const wishlist = await this.getOrCreate(userId);
    const existing = wishlist.items.find((i) => i.productId === productId);
    if (!existing) {
      await this.prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
    }
    return this.findMine(userId);
  }

  async removeItem(userId: number, productId: number) {
    const wishlist = await this.getOrCreate(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return this.findMine(userId);
  }

  async moveToCart(userId: number, productId: number) {
    const wishlist = await this.getOrCreate(userId);
    const item = wishlist.items.find((i) => i.productId === productId);
    if (!item) throw new BadRequestException('Item not found in wishlist');

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    const targetCart = cart ?? (await this.prisma.cart.create({ data: { userId } }));

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: { cartId: targetCart.id, productId, variantId: null },
    });
    if (existingCartItem) {
      await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      await this.prisma.cartItem.create({ data: { cartId: targetCart.id, productId, quantity: 1 } });
    }
    await this.prisma.wishlistItem.delete({ where: { id: item.id } });
    return this.findMine(userId);
  }
}
