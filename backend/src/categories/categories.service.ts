import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      include: { children: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findById(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async uniqueSlug(name: string, excludeId?: number): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.category.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter++}`;
    }
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Parent category does not exist');
    }
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.category.create({ data: { ...dto, slug } });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findById(id);
    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Parent category does not exist');
    }
    const data: any = { ...dto };
    if (dto.name) {
      data.slug = await this.uniqueSlug(dto.name, id);
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async archive(id: number) {
    await this.findById(id);
    return this.prisma.category.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async remove(id: number) {
    const inUse = await this.prisma.product.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new ConflictException('Cannot delete a category that has products; archive it instead');
    }
    const hasChildren = await this.prisma.category.count({ where: { parentId: id } });
    if (hasChildren > 0) {
      throw new ConflictException('Cannot delete a category that has subcategories');
    }
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }
}
