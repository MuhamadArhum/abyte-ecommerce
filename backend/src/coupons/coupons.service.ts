import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ]);
    return {
      items,
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
    };
  }

  async findById(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException('A coupon with this code already exists');
    return this.prisma.coupon.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        categoryIds: dto.categoryIds as Prisma.InputJsonValue,
        productIds: dto.productIds as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: number, dto: UpdateCouponDto) {
    await this.findById(id);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        categoryIds: dto.categoryIds as Prisma.InputJsonValue,
        productIds: dto.productIds as Prisma.InputJsonValue,
      },
    });
  }

  async setActive(id: number, active: boolean) {
    await this.findById(id);
    return this.prisma.coupon.update({ where: { id }, data: { active } });
  }

  async remove(id: number) {
    await this.findById(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Validates a coupon for a given user/cart and returns the discount amount.
   * This must be re-run server-side at checkout — never trust a client-supplied discount.
   */
  async validateAndCompute(
    code: string,
    userId: number,
    subtotal: number,
    cartProductIds: number[],
    cartCategoryIds: number[],
  ): Promise<{ coupon: Coupon; discount: number }> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount of ${coupon.minOrderAmount} required for this coupon`);
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (coupon.perCustomerLimit) {
      const usedByCustomer = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (usedByCustomer >= coupon.perCustomerLimit) {
        throw new BadRequestException('You have already used this coupon the maximum number of times');
      }
    }

    const restrictedProductIds = (coupon.productIds as number[] | null) ?? [];
    const restrictedCategoryIds = (coupon.categoryIds as number[] | null) ?? [];
    if (restrictedProductIds.length > 0) {
      const matches = cartProductIds.some((id) => restrictedProductIds.includes(id));
      if (!matches) throw new BadRequestException('This coupon does not apply to any item in your cart');
    }
    if (restrictedCategoryIds.length > 0) {
      const matches = cartCategoryIds.some((id) => restrictedCategoryIds.includes(id));
      if (!matches) throw new BadRequestException('This coupon does not apply to any item in your cart');
    }

    let discount =
      coupon.type === CouponType.PERCENTAGE ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);

    if (coupon.maxDiscountAmount) {
      discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    }
    discount = Math.min(discount, subtotal);
    discount = Math.round(discount * 100) / 100;

    return { coupon, discount };
  }
}
