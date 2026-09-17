'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { Coupon, PaginatedResponse } from '@/types';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await api.get<PaginatedResponse<Coupon>>('/coupons?limit=50');
    setCoupons(result.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/coupons', {
        code,
        type,
        value: Number(value),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCode('');
      setValue('10');
      setMinOrderAmount('');
      setUsageLimit('');
      setExpiresAt('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create coupon');
    }
  }

  async function toggleActive(coupon: Coupon) {
    await api.patch(`/coupons/${coupon.id}/active`, { active: !coupon.active });
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/coupons/${id}`);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Coupons</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <div>
          <label className="label" htmlFor="coupon-code">Code</label>
          <input id="coupon-code" required className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="coupon-type">Type</label>
          <select id="coupon-type" className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="coupon-value">Value</label>
          <input id="coupon-value" type="number" min={0} className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="coupon-minOrder">Min order</label>
          <input id="coupon-minOrder" type="number" min={0} className="input" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="coupon-usageLimit">Usage limit</label>
          <input id="coupon-usageLimit" type="number" min={0} className="input" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="coupon-expiresAt">Expires at</label>
          <input id="coupon-expiresAt" type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="col-span-full">
          <button className="btn-primary" type="submit">
            Create coupon
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.code}</td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3">{c.type === 'PERCENTAGE' ? `${c.value}%` : c.value}</td>
                <td className="px-4 py-3">
                  {c.usageCount}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button className="text-gray-700 hover:underline" onClick={() => toggleActive(c)}>
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(c.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
