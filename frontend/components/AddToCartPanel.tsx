'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';

export default function AddToCartPanel({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState<number | undefined>(product.variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const availableStock = selectedVariant ? selectedVariant.stock : product.inventory?.quantity ?? 0;
  const inStock = availableStock > 0;

  async function handleAddToCart() {
    if (!user) {
      router.push('/account/login?next=/products/' + product.slug);
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await addItem(product.id, quantity, variantId);
      setSuccess('Added to cart');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add to cart');
    } finally {
      setLoading(false);
    }
  }

  async function handleWishlist() {
    if (!user) {
      router.push('/account/login?next=/products/' + product.slug);
      return;
    }
    try {
      await api.post(`/wishlist/${product.id}`);
      setSuccess('Added to wishlist');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add to wishlist');
    }
  }

  return (
    <div className="space-y-4">
      {product.variants.length > 0 && (
        <div>
          <span className="label">Options</span>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={
                  v.id === variantId
                    ? 'rounded-md border-2 border-gray-900 px-3 py-1.5 text-sm'
                    : 'rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500'
                }
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="label mb-0">Quantity</span>
        <div className="flex items-center rounded-md border border-gray-300">
          <button className="px-3 py-1" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-10 text-center">{quantity}</span>
          <button
            className="px-3 py-1"
            onClick={() => setQuantity((q) => Math.min(availableStock || 1, q + 1))}
          >
            +
          </button>
        </div>
        <span className="text-xs text-gray-500">
          {inStock ? `${availableStock} in stock` : 'Out of stock'}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex gap-3">
        <button className="btn-primary flex-1" disabled={!inStock || loading} onClick={handleAddToCart}>
          {loading ? 'Adding...' : 'Add to cart'}
        </button>
        <button className="btn-secondary" onClick={handleWishlist}>
          ♡ Wishlist
        </button>
      </div>
    </div>
  );
}
