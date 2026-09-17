'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { formatCurrency } from '@/lib/format';
import { EmptyState } from '@/components/LoadingState';
import { ApiError } from '@/lib/api-client';

export default function CartPage() {
  const { cart, refresh, updateItem, removeItem } = useCartStore();
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/account/login?next=/cart');
      return;
    }
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function handleQuantityChange(itemId: number, quantity: number) {
    if (quantity < 1) return;
    setBusyId(itemId);
    setError(null);
    try {
      await updateItem(itemId, quantity);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update item');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(itemId: number) {
    setBusyId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setBusyId(null);
    }
  }

  if (!hydrated || !user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Your Cart</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {cart.items.length === 0 ? (
        <EmptyState title="Your cart is empty" message="Browse products and add something you like." />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.slug}`} className="font-medium text-gray-900 hover:underline">
                      {item.name}
                    </Link>
                    {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                    {!item.inStock && <p className="text-xs text-red-600">Only {item.availableStock} left in stock</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        className="px-2 py-1"
                        disabled={busyId === item.id}
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        className="px-2 py-1"
                        disabled={busyId === item.id}
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={busyId === item.id}
                  className="self-start text-xs text-gray-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="card h-fit p-5">
            <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Shipping and taxes calculated at checkout.</p>
            <Link
              href="/checkout"
              className="btn-primary mt-4 block w-full text-center"
              aria-disabled={cart.items.some((i) => !i.inStock)}
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
