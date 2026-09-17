'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type { PaginatedResponse, Product } from '@/types';
import { EmptyState } from '@/components/LoadingState';

export default function AdminProductsPage() {
  const [result, setResult] = useState<PaginatedResponse<Product> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    setResult(await api.get<PaginatedResponse<Product>>(`/products/admin/all?${params.toString()}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleArchive(id: number) {
    try {
      await api.patch(`/products/${id}/archive`, {});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not archive product');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete product');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New product
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex gap-2"
      >
        <input className="input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-secondary" type="submit">
          Search
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!result ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : result.items.length === 0 ? (
        <EmptyState title="No products" message="Create your first product to get started." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">{formatCurrency(p.discountPrice ?? p.price)}</td>
                  <td className="px-4 py-3">{p.inventory?.quantity ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-gray-700 hover:underline">
                        Edit
                      </Link>
                      <button onClick={() => handleArchive(p.id)} className="text-gray-500 hover:underline">
                        Archive
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
