'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types';

interface InventoryRow {
  productId: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  product: { id: number; name: string; sku: string; slug: string };
}

export default function AdminInventoryPage() {
  const [result, setResult] = useState<PaginatedResponse<InventoryRow> | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [amount, setAmount] = useState('0');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setResult(
      await api.get<PaginatedResponse<InventoryRow>>(`/inventory?limit=50&lowStockOnly=${lowStockOnly}`),
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockOnly]);

  async function handleAdjust(productId: number) {
    setError(null);
    try {
      await api.patch(`/inventory/${productId}/adjust`, {
        quantity: Number(amount),
        type: 'ADJUSTMENT',
        reason: reason || 'Manual adjustment',
      });
      setAdjusting(null);
      setAmount('0');
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not adjust stock');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Threshold</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result?.items.map((row) => (
              <tr key={row.productId}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.product.name}</td>
                <td className="px-4 py-3 text-gray-500">{row.product.sku}</td>
                <td className={`px-4 py-3 ${row.quantity <= row.lowStockThreshold ? 'text-red-600' : ''}`}>
                  {row.quantity}
                </td>
                <td className="px-4 py-3">{row.lowStockThreshold}</td>
                <td className="px-4 py-3">
                  {adjusting === row.productId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input w-24"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="+/-"
                      />
                      <input
                        className="input w-40"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason"
                      />
                      <button className="btn-secondary" onClick={() => handleAdjust(row.productId)}>
                        Save
                      </button>
                      <button className="text-xs text-gray-500" onClick={() => setAdjusting(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="text-gray-700 hover:underline" onClick={() => setAdjusting(row.productId)}>
                      Adjust stock
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
