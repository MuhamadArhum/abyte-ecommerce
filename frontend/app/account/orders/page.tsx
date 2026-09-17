'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import { EmptyState } from '@/components/LoadingState';
import type { Order, PaginatedResponse } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export default function OrdersPage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hydrated && !user) router.push('/account/login?next=/account/orders');
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function load() {
    setLoading(true);
    const result = await api.get<PaginatedResponse<Order>>('/orders?limit=50');
    setOrders(result.items);
    setLoading(false);
  }

  if (!hydrated || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Orders</h1>
      {!loading && orders.length === 0 ? (
        <EmptyState title="No orders yet" message="Your placed orders will show up here." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-gray-400"
            >
              <div>
                <p className="font-medium text-gray-900">{order.orderNumber}</p>
                <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}>
                {order.status}
              </span>
              <span className="font-semibold text-gray-900">{formatCurrency(order.grandTotal)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
