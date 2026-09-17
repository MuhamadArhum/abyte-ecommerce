import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.brand.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({ where: { slug } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async findById(id: number) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  private async uniqueSlug(name: string, excludeId?: number): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.brand.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter++}`;
    }
  }

  async create(dto: CreateBrandDto) {
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.brand.create({ data: { ...dto, slug } });
  }

  async update(id: number, dto: UpdateBrandDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.name) data.slug = await this.uniqueSlug(dto.name, id);
    return this.prisma.brand.update({ where: { id }, data });
  }

  async archive(id: number) {
    await this.findById(id);
    return this.prisma.brand.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async remove(id: number) {
    const inUse = await this.prisma.product.count({ where: { brandId: id } });
    if (inUse > 0) {
      throw new ConflictException('Cannot delete a brand that has products; archive it instead');
    }
    await this.prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }
}
