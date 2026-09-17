import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: number | null, action: string, entityType: string, entityId?: string, metadata?: unknown, ipAddress?: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: metadata as any, ipAddress },
    });
  }

  async findAll(pagination: PaginationDto, entityType?: string) {
    const where = entityType ? { entityType } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      meta: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) || 1 },
    };
  }
}
