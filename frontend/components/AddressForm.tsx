'use client';

import { useState } from 'react';
import type { Address } from '@/types';

export interface AddressFormValues {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export default function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save address',
}: {
  initial?: Partial<Address>;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<AddressFormValues>({
    fullName: initial?.fullName ?? '',
    phone: initial?.phone ?? '',
    line1: initial?.line1 ?? '',
    line2: initial?.line2 ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    postalCode: initial?.postalCode ?? '',
    country: initial?.country ?? '',
    isDefault: initial?.isDefault ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.message ?? 'Could not save address');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="addr-fullName">Full name</label>
          <input id="addr-fullName" required className="input" value={values.fullName} onChange={(e) => update('fullName', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="addr-phone">Phone</label>
          <input id="addr-phone" required className="input" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="addr-line1">Address line 1</label>
        <input id="addr-line1" required className="input" value={values.line1} onChange={(e) => update('line1', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="addr-line2">Address line 2 (optional)</label>
        <input id="addr-line2" className="input" value={values.line2} onChange={(e) => update('line2', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="addr-city">City</label>
          <input id="addr-city" required className="input" value={values.city} onChange={(e) => update('city', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="addr-state">State</label>
          <input id="addr-state" required className="input" value={values.state} onChange={(e) => update('state', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="addr-postalCode">Postal code</label>
          <input id="addr-postalCode" required className="input" value={values.postalCode} onChange={(e) => update('postalCode', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="addr-country">Country</label>
        <input id="addr-country" required className="input" value={values.country} onChange={(e) => update('country', e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={values.isDefault} onChange={(e) => update('isDefault', e.target.checked)} />
        Set as default address
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
