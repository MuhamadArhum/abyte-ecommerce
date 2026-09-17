'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@/types';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      useAuthStore.getState().setAuth(accessToken, null);
      const user = await api.get<User>('/users/me');
      setAuth(accessToken, user);
      router.push(searchParams.get('next') || '/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Sign in</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-gray-500">
          <Link href="/account/forgot-password" className="hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          No account?{' '}
          <Link href="/account/register" className="font-medium text-gray-900 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
