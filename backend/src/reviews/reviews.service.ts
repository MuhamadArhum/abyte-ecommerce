import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProduct(productId: number, pagination: PaginationDto) {
    const where = { productId, status: ReviewStatus.APPROVED };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
    };
  }

  async findPending(pagination: PaginationDto) {
    const where = { status: ReviewStatus.PENDING };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
    };
  }

  async create(userId: number, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Only customers who purchased and received the product may review it.
    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
    });
    if (!purchased) {
      throw new BadRequestException('You can only review products you have purchased and received');
    }

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    return this.prisma.review.create({
      data: { ...dto, userId, status: ReviewStatus.PENDING },
    });
  }

  private async assertOwnership(id: number, userId: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You do not own this review');
    return review;
  }

  async update(userId: number, id: number, dto: UpdateReviewDto) {
    await this.assertOwnership(id, userId);
    return this.prisma.review.update({
      where: { id },
      data: { ...dto, status: ReviewStatus.PENDING },
    });
  }

  async remove(userId: number, id: number, isAdmin: boolean) {
    if (!isAdmin) await this.assertOwnership(id, userId);
    else {
      const review = await this.prisma.review.findUnique({ where: { id } });
      if (!review) throw new NotFoundException('Review not found');
    }
    await this.prisma.review.delete({ where: { id } });
    return { deleted: true };
  }

  async moderate(id: number, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.review.update({ where: { id }, data: { status } });
  }
}
