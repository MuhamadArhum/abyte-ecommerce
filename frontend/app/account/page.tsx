'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';
import type { User } from '@/types';

export default function ProfilePage() {
  const { user, hydrated, setAuth, accessToken } = useAuthStore();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !user) router.push('/account/login?next=/account');
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone(user.phone ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const updated = await api.patch<User>('/users/me', { firstName, lastName, phone });
      setAuth(accessToken, updated);
      setMessage('Profile updated');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update profile');
    }
  }

  if (!hydrated || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Profile</h1>
      <form onSubmit={handleSubmit} className="card max-w-lg space-y-4 p-6">
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input className="input bg-gray-50" value={user.email} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>

      <ChangePasswordForm />
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMessage('Password changed. Please sign in again on other devices.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change password');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-6 max-w-lg space-y-4 p-6">
      <h2 className="font-semibold text-gray-900">Change password</h2>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="label">Current password</label>
        <input
          type="password"
          required
          className="input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          required
          minLength={8}
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-secondary">
        Update password
      </button>
    </form>
  );
}
