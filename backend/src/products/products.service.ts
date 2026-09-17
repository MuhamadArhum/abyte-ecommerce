import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ProductVariantDto } from './dto/product-variant.dto';

const PUBLIC_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
  category: true,
  brand: true,
  inventory: true,
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(name: string, excludeId?: number): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter++}`;
    }
  }

  async findAllPublic(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = { status: ProductStatus.PUBLISHED };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
        { sku: { contains: query.search } },
      ];
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.brand) {
      where.brand = { slug: query.brand };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.isInStockOnly) {
      where.inventory = { quantity: { gt: 0 } };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sortBy === 'price'
        ? { price: query.sortDir ?? 'asc' }
        : query.sortBy === 'name'
          ? { name: query.sortDir ?? 'asc' }
          : { createdAt: query.sortDir ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async findBySlugPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: {
        ...PUBLIC_INCLUDE,
        reviews: { where: { status: 'APPROVED' }, include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findRelated(productId: number, limit = 8) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.findMany({
      where: {
        id: { not: productId },
        status: ProductStatus.PUBLISHED,
        OR: [{ categoryId: product.categoryId }, { brandId: product.brandId }],
      },
      include: PUBLIC_INCLUDE,
      take: limit,
    });
  }

  async findAllAdmin(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [{ name: { contains: query.search } }, { sku: { contains: query.search } }];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PUBLIC_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) || 1 },
    };
  }

  async findByIdAdmin(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PUBLIC_INCLUDE });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    if (dto.discountPrice !== undefined && dto.discountPrice >= dto.price) {
      throw new BadRequestException('Discount price must be lower than the regular price');
    }
    const slug = await this.uniqueSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          specifications: dto.specifications as Prisma.InputJsonValue,
          sku: dto.sku,
          price: dto.price,
          discountPrice: dto.discountPrice,
          status: dto.status ?? ProductStatus.DRAFT,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          images: dto.images
            ? { create: dto.images.map((img, idx) => ({ ...img, sortOrder: idx })) }
            : undefined,
          variants: dto.variants ? { create: dto.variants } : undefined,
        },
        include: PUBLIC_INCLUDE,
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          quantity: dto.initialStock,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
        },
      });

      if (dto.initialStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'RESTOCK',
            quantity: dto.initialStock,
            reason: 'Initial stock on product creation',
          },
        });
      }

      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: PUBLIC_INCLUDE });
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.findByIdAdmin(id);
    const price = dto.price ?? Number(existing.price);
    const discountPrice = dto.discountPrice ?? (existing.discountPrice ? Number(existing.discountPrice) : undefined);
    if (discountPrice !== undefined && discountPrice >= price) {
      throw new BadRequestException('Discount price must be lower than the regular price');
    }

    const data: Prisma.ProductUpdateInput = {
      name: dto.name,
      description: dto.description,
      specifications: dto.specifications as Prisma.InputJsonValue,
      sku: dto.sku,
      price: dto.price,
      discountPrice: dto.discountPrice,
      status: dto.status,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
    };
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }
    if (dto.brandId !== undefined) {
      data.brand = dto.brandId ? { connect: { id: dto.brandId } } : { disconnect: true };
    }
    if (dto.name && dto.name !== existing.name) {
      data.slug = await this.uniqueSlug(dto.name, id);
    }

    return this.prisma.product.update({ where: { id }, data, include: PUBLIC_INCLUDE });
  }

  async archive(id: number) {
    await this.findByIdAdmin(id);
    return this.prisma.product.update({ where: { id }, data: { status: ProductStatus.ARCHIVED } });
  }

  async remove(id: number) {
    const usedInOrders = await this.prisma.orderItem.count({ where: { productId: id } });
    if (usedInOrders > 0) {
      throw new BadRequestException('Cannot delete a product that has order history; archive it instead');
    }
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  async replaceImages(id: number, images: { url: string; altText?: string; isPrimary?: boolean }[]) {
    await this.findByIdAdmin(id);
    await this.prisma.$transaction([
      this.prisma.productImage.deleteMany({ where: { productId: id } }),
      this.prisma.productImage.createMany({
        data: images.map((img, idx) => ({ ...img, productId: id, sortOrder: idx })),
      }),
    ]);
    return this.findByIdAdmin(id);
  }

  async addVariant(productId: number, dto: ProductVariantDto) {
    await this.findByIdAdmin(productId);
    await this.prisma.productVariant.create({ data: { ...dto, productId } });
    return this.findByIdAdmin(productId);
  }

  async updateVariant(productId: number, variantId: number, dto: Partial<ProductVariantDto>) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Variant not found for this product');
    }
    await this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
    return this.findByIdAdmin(productId);
  }

  async removeVariant(productId: number, variantId: number) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      throw new NotFoundException('Variant not found for this product');
    }
    const usedInOrders = await this.prisma.orderItem.count({ where: { variantId } });
    if (usedInOrders > 0) {
      throw new BadRequestException('Cannot delete a variant that has order history');
    }
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return this.findByIdAdmin(productId);
  }

  async adjustVariantStock(productId: number, variantId: number, quantity: number, reason: string | undefined, performedById: number) {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Variant not found for this product');
      }
      if (quantity < 0 && variant.stock + quantity < 0) {
        throw new BadRequestException('Resulting variant stock cannot be negative');
      }
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId,
          variantId,
          type: 'ADJUSTMENT',
          quantity,
          reason,
          performedById,
        },
      });
      return updated;
    });
  }
}
