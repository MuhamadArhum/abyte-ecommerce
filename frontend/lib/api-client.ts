import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const token = json.data?.accessToken as string | undefined;
    if (token) {
      useAuthStore.getState().setAuth(token, useAuthStore.getState().user);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRetry, ...init } = options;
  const token = useAuthStore.getState().accessToken;

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !skipAuthRetry) {
    const newToken = await refreshSession();
    if (newToken) {
      return apiFetch<T>(path, { ...options, skipAuthRetry: true });
    }
    useAuthStore.getState().clear();
  }

  const contentType = res.headers.get('content-type') ?? '';
  const json = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = Array.isArray(json?.message) ? json.message.join(', ') : json?.message || res.statusText;
    throw new ApiError(message, res.status);
  }

  return (json?.data ?? json) as T;
}

export const api = {
  get: <T,>(path: string) => apiFetch<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T,>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
