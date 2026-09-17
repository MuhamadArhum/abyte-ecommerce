'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Order } from '@/types';

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order & { user: { firstName: string; lastName: string; email: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setOrder(await api.get(`/orders/${params.id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleStatusChange(newStatus: string) {
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/orders/${params.id}/status`, { status: newStatus });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update order status');
    } finally {
      setUpdating(false);
    }
  }

  if (!order) return <p className="text-sm text-gray-500">Loading...</p>;
  const nextOptions = NEXT_STATUSES[order.status] ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {order.user.firstName} {order.user.lastName} — {order.user.email}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{order.status}</span>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {nextOptions.length > 0 && (
        <div className="card mb-6 flex items-center gap-3 p-4">
          <span className="text-sm text-gray-600">Update status:</span>
          {nextOptions.map((s) => (
            <button key={s} className="btn-secondary" disabled={updating} onClick={() => handleStatusChange(s)}>
              Mark as {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-gray-900">Items</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between py-2">
                <span>
                  {item.nameSnapshot} × {item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-semibold text-gray-900">Totals</h2>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(order.discountTotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingTotal)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
          </div>
          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-semibold text-gray-900">Status history</h2>
            <ul className="space-y-1">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex justify-between text-gray-600">
                  <span>{h.status}</span>
                  <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
