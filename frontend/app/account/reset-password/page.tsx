'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/reset-password', { token: searchParams.get('token'), newPassword });
      setDone(true);
      setTimeout(() => router.push('/account/login'), 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset password');
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Set a new password</h1>
      {done ? (
        <p className="card p-6 text-sm text-green-700">Password reset. Redirecting to sign in...</p>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <p className="text-sm text-red-600">{error}</p>}
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
          <button type="submit" className="btn-primary w-full">
            Reset password
          </button>
        </form>
      )}
    </div>
  );
}
