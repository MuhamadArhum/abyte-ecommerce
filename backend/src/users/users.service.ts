import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  role: { select: { name: true } },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });
  }

  async findAll(pagination: PaginationDto, filters: { role?: RoleName; search?: string }) {
    const where: any = {};
    if (filters.role) where.role = { name: filters.role };
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search } },
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async updateStatus(id: number, status: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      select: SAFE_SELECT,
    });
  }

  async updateRole(id: number, roleName: RoleName) {
    await this.findById(id);
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      select: SAFE_SELECT,
    });
  }
}
