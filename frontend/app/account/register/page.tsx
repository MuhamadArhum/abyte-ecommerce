'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/types';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/register', {
        firstName,
        lastName,
        email,
        password,
      });
      useAuthStore.getState().setAuth(accessToken, null);
      const user = await api.get<User>('/users/me');
      setAuth(accessToken, user);
      router.push('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Create an account</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input required className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input required className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">
            At least 8 characters, with an uppercase letter, lowercase letter, and number.
          </p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/account/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
