'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import type { Address } from '@/types';
import AddressForm, { AddressFormValues } from '@/components/AddressForm';
import { EmptyState } from '@/components/LoadingState';

export default function AddressesPage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  useEffect(() => {
    if (hydrated && !user) router.push('/account/login?next=/account/addresses');
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function load() {
    setAddresses(await api.get<Address[]>('/addresses'));
  }

  async function handleCreate(values: AddressFormValues) {
    await api.post('/addresses', values);
    await load();
    setShowForm(false);
  }

  async function handleUpdate(values: AddressFormValues) {
    if (!editing) return;
    await api.patch(`/addresses/${editing.id}`, values);
    await load();
    setEditing(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this address?')) return;
    await api.delete(`/addresses/${id}`);
    await load();
  }

  if (!hydrated || !user) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Addresses</h1>
        {!showForm && !editing && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Add address
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-6 max-w-lg p-6">
          <AddressForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Add address" />
        </div>
      )}

      {editing && (
        <div className="card mb-6 max-w-lg p-6">
          <AddressForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} submitLabel="Update address" />
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <EmptyState title="No saved addresses" message="Add an address to speed up checkout." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{addr.fullName}</span>
                {addr.isDefault && (
                  <span className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white">Default</span>
                )}
              </div>
              <p className="mt-1 text-gray-600">{addr.phone}</p>
              <p className="text-gray-600">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
              </p>
              <div className="mt-3 flex gap-3">
                <button className="text-gray-600 hover:underline" onClick={() => setEditing(addr)}>
                  Edit
                </button>
                <button className="text-red-600 hover:underline" onClick={() => handleDelete(addr.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
