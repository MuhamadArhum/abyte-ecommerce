'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Order, PaginatedResponse } from '@/types';

export default function AdminOrdersPage() {
  const [result, setResult] = useState<PaginatedResponse<Order & { user: { firstName: string; lastName: string; email: string } }> | null>(null);
  const [status, setStatus] = useState('');

  async function load() {
    const params = new URLSearchParams({ limit: '50' });
    if (status) params.set('status', status);
    setResult(await api.get(`/orders/admin/all?${params.toString()}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result?.items.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-gray-900 hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {o.user.firstName} {o.user.lastName}
                </td>
                <td className="px-4 py-3">{formatCurrency(o.grandTotal)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{o.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
