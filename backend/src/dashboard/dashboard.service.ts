import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalSalesAgg,
      totalOrders,
      totalCustomers,
      totalProducts,
      recentOrders,
      recentCustomers,
      orderStatusCounts,
      salesLast30Days,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: { paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { role: { name: 'CUSTOMER' } } }),
      this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.user.findMany({
        where: { role: { name: 'CUSTOMER' } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: PaymentStatus.PAID },
        select: { createdAt: true, grandTotal: true },
      }),
    ]);

    const lowStockProducts = await this.prisma.inventory.findMany({
      include: { product: { select: { id: true, name: true, sku: true, slug: true } } },
    });
    const lowStock = lowStockProducts.filter((i) => i.quantity <= i.lowStockThreshold).slice(0, 20);

    const salesByDay = new Map<string, number>();
    for (const order of salesLast30Days) {
      const day = order.createdAt.toISOString().slice(0, 10);
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(order.grandTotal));
    }

    return {
      totalSales: Number(totalSalesAgg._sum.grandTotal ?? 0),
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockCount: lowStock.length,
      recentOrders,
      recentCustomers,
      orderStatusBreakdown: orderStatusCounts.map((s) => ({ status: s.status, count: s._count._all })),
      lowStockProducts: lowStock,
      salesTrend: Array.from(salesByDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({ date, total })),
    };
  }
}
