'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { PaginatedResponse, User } from '@/types';
import { useAuthStore } from '@/lib/auth-store';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'];

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [result, setResult] = useState<PaginatedResponse<User> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setResult(await api.get<PaginatedResponse<User>>('/users?limit=50'));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.patch(`/users/${id}/status`, { status });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update status');
    }
  }

  async function handleRoleChange(id: number, role: string) {
    try {
      await api.patch(`/users/${id}/role`, { role });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update role');
    }
  }

  const isSuperAdmin = currentUser?.role.name === 'SUPER_ADMIN';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Users</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result?.items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin ? (
                    <select
                      className="input w-auto"
                      value={u.role.name}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    u.role.name
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="input w-auto"
                    value={u.status}
                    onChange={(e) => handleStatusChange(u.id, e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING_VERIFICATION">Pending</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
