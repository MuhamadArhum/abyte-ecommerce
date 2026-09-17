'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/auth/forgot-password', { email });
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Reset your password</h1>
      {sent ? (
        <p className="card p-6 text-sm text-gray-700">
          If an account exists for {email}, a password reset link has been sent.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full">
            Send reset link
          </button>
        </form>
      )}
    </div>
  );
}
