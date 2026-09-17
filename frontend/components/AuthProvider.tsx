'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api, refreshSession } from '@/lib/api-client';
import type { User } from '@/types';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    (async () => {
      const token = await refreshSession();
      if (token) {
        try {
          const user = await api.get<User>('/users/me');
          setAuth(token, user);
        } catch {
          setAuth(null, null);
        }
      }
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
