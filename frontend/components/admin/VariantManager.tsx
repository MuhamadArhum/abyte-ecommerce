'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { Product } from '@/types';

function parseAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const pair of text.split(',')) {
    const [key, value] = pair.split(':').map((s) => s.trim());
    if (key && value) attrs[key] = value;
  }
  return attrs;
}

export default function VariantManager({ product, onChange }: { product: Product; onChange: () => void }) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [attributesText, setAttributesText] = useState('');
  const [stock, setStock] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [amount, setAmount] = useState('0');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/products/${product.id}/variants`, {
        sku,
        name,
        attributes: parseAttributes(attributesText),
        stock: Number(stock) || 0,
      });
      setSku('');
      setName('');
      setAttributesText('');
      setStock('0');
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add variant');
    }
  }

  async function handleAdjust(variantId: number) {
    setError(null);
    try {
      await api.patch(`/products/${product.id}/variants/${variantId}/stock`, {
        quantity: Number(amount),
        reason: 'Admin stock adjustment',
      });
      setAdjusting(null);
      setAmount('0');
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not adjust variant stock');
    }
  }

  async function handleRemove(variantId: number) {
    if (!confirm('Remove this variant?')) return;
    setError(null);
    try {
      await api.delete(`/products/${product.id}/variants/${variantId}`);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove variant');
    }
  }

  return (
    <div className="card mt-6 max-w-3xl p-6">
      <h2 className="mb-3 font-semibold text-gray-900">Variants</h2>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {product.variants.length > 0 ? (
        <ul className="mb-4 divide-y divide-gray-100 text-sm">
          {product.variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2">
              <span>
                {v.name} <span className="text-gray-400">({v.sku})</span> — {v.stock} in stock
              </span>
              {adjusting === v.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input w-24"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="+/-"
                  />
                  <button className="btn-secondary" onClick={() => handleAdjust(v.id)}>
                    Save
                  </button>
                  <button className="text-xs text-gray-500" onClick={() => setAdjusting(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button className="text-gray-700 hover:underline" onClick={() => setAdjusting(v.id)}>
                    Adjust stock
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => handleRemove(v.id)}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-500">No variants yet.</p>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-4 gap-2">
        <input required placeholder="SKU" className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input required placeholder="Name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="attributes: color:Red,size:L"
          className="input"
          value={attributesText}
          onChange={(e) => setAttributesText(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            placeholder="Stock"
            className="input"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
