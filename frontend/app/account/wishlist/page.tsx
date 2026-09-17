'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import { EmptyState } from '@/components/LoadingState';
import type { Product } from '@/types';

interface WishlistItem {
  id: number;
  productId: number;
  product: Product;
}

export default function WishlistPage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    if (hydrated && !user) router.push('/account/login?next=/account/wishlist');
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function load() {
    const wishlist = await api.get<{ items: WishlistItem[] }>('/wishlist');
    setItems(wishlist.items);
  }

  async function handleRemove(productId: number) {
    await api.delete(`/wishlist/${productId}`);
    await load();
  }

  async function handleMoveToCart(productId: number) {
    await api.post(`/wishlist/${productId}/move-to-cart`);
    await load();
  }

  if (!hydrated || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Wishlist</h1>
      {items.length === 0 ? (
        <EmptyState title="Your wishlist is empty" message="Save products you love for later." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const image = item.product.images?.[0];
            const price = item.product.discountPrice ? Number(item.product.discountPrice) : Number(item.product.price);
            return (
              <div key={item.id} className="card flex gap-4 p-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {image && <Image src={image.url} alt={item.product.name} fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${item.product.slug}`} className="font-medium text-gray-900 hover:underline">
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-600">{formatCurrency(price)}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button className="text-gray-900 underline" onClick={() => handleMoveToCart(item.productId)}>
                      Move to cart
                    </button>
                    <button className="text-red-600 underline" onClick={() => handleRemove(item.productId)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
