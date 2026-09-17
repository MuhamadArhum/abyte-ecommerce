'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { Brand } from '@/types';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Brand | null>(null);

  async function load() {
    setBrands(await api.get<Brand[]>('/brands/admin/all'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/brands', { name });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create brand');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.patch(`/brands/${editing.id}`, { name: editing.name });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update brand');
    }
  }

  async function handleArchive(id: number) {
    await api.patch(`/brands/${id}/archive`, {});
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this brand?')) return;
    try {
      await api.delete(`/brands/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete brand');
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Brands</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="card mb-6 flex items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="brand-name">Name</label>
          <input id="brand-name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit">
          Add brand
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  {editing?.id === b.id ? (
                    <form onSubmit={handleUpdate} className="flex gap-2">
                      <input
                        className="input"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                      <button className="btn-secondary" type="submit">
                        Save
                      </button>
                    </form>
                  ) : (
                    b.name
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{b.slug}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{b.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button className="text-gray-700 hover:underline" onClick={() => setEditing(b)}>
                      Edit
                    </button>
                    <button className="text-gray-500 hover:underline" onClick={() => handleArchive(b.id)}>
                      Archive
                    </button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(b.id)}>
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
