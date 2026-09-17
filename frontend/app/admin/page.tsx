'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import StatCard from '@/components/StatCard';

interface Summary {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  recentOrders: { id: number; orderNumber: string; grandTotal: string; status: string; createdAt: string; user: { firstName: string; lastName: string } }[];
  recentCustomers: { id: number; firstName: string; lastName: string; email: string; createdAt: string }[];
  orderStatusBreakdown: { status: string; count: number }[];
  lowStockProducts: { productId: number; quantity: number; lowStockThreshold: number; product: { name: string; sku: string } }[];
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.get<Summary>('/dashboard/summary').then(setSummary);
  }, []);

  if (!summary) return <p className="text-sm text-gray-500">Loading dashboard...</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total sales" value={formatCurrency(summary.totalSales)} />
        <StatCard label="Orders" value={summary.totalOrders} />
        <StatCard label="Customers" value={summary.totalCustomers} />
        <StatCard label="Published products" value={summary.totalProducts} />
      </div>

      {summary.lowStockCount > 0 && (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          {summary.lowStockCount} product(s) are low on stock.{' '}
          <Link href="/admin/inventory" className="font-medium underline">
            Review inventory
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Recent orders</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {summary.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="text-gray-500">{o.status}</span>
                <span>{formatCurrency(o.grandTotal)}</span>
              </li>
            ))}
            {summary.recentOrders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Recent customers</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {summary.recentCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-gray-500">{formatDate(c.createdAt)}</span>
              </li>
            ))}
            {summary.recentCustomers.length === 0 && <p className="text-gray-500">No customers yet.</p>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Order status breakdown</h2>
          <ul className="space-y-2 text-sm">
            {summary.orderStatusBreakdown.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span className="text-gray-600">{s.status}</span>
                <span className="font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Low stock products</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {summary.lowStockProducts.map((i) => (
              <li key={i.productId} className="flex justify-between py-2">
                <span>{i.product.name}</span>
                <span className="text-red-600">{i.quantity} left</span>
              </li>
            ))}
            {summary.lowStockProducts.length === 0 && <p className="text-gray-500">All products well stocked.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
