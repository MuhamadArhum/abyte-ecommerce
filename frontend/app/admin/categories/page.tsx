'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import type { Category } from '@/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  async function load() {
    setCategories(await api.get<Category[]>('/categories/admin/all'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/categories', { name, parentId: parentId ? Number(parentId) : undefined });
      setName('');
      setParentId('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create category');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      await api.patch(`/categories/${editing.id}`, { name: editing.name });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update category');
    }
  }

  async function handleArchive(id: number) {
    await api.patch(`/categories/${id}/archive`, {});
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete category');
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Categories</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Name</label>
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Parent category</label>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">
          Add category
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
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  {editing?.id === c.id ? (
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
                    c.name
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button className="text-gray-700 hover:underline" onClick={() => setEditing(c)}>
                      Edit
                    </button>
                    <button className="text-gray-500 hover:underline" onClick={() => handleArchive(c.id)}>
                      Archive
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
