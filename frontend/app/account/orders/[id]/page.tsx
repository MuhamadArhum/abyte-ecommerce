'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Order } from '@/types';

export default function OrderDetailPage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.push(`/account/login?next=/account/orders/${params.id}`);
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function load() {
    try {
      setOrder(await api.get<Order>(`/orders/${params.id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load order');
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await api.patch(`/orders/${params.id}/cancel`, {});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  }

  if (!hydrated || !user) return null;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!order) return <p className="text-sm text-gray-500">Loading...</p>;

  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

  return (
    <div>
      {searchParams.get('placed') && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Thank you! Your order has been placed successfully.
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>
        {canCancel && (
          <button className="btn-danger" disabled={cancelling} onClick={handleCancel}>
            Cancel order
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
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

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Status history</h2>
            <ul className="space-y-2 text-sm">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex justify-between text-gray-600">
                  <span>
                    {h.status}
                    {h.note ? ` — ${h.note}` : ''}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold text-gray-900">Summary</h2>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount {order.coupon ? `(${order.coupon.code})` : ''}</span>
                  <span>-{formatCurrency(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>{formatCurrency(order.shippingTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{formatCurrency(order.taxTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Payment: {order.paymentMethod} — {order.paymentStatus}
            </p>
          </div>

          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-semibold text-gray-900">Shipping address</h2>
            <p className="text-gray-600">
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
