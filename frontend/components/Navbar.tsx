'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore, cartItemCount } from '@/lib/cart-store';
import { api } from '@/lib/api-client';

export default function Navbar() {
  const { user, hydrated, clear } = useAuthStore();
  const { cart, refresh } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clear();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Abyte
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/products" className="hover:text-gray-900">
            Shop
          </Link>
          <Link href="/products?sortBy=createdAt&sortDir=desc" className="hover:text-gray-900">
            New Arrivals
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-sm font-medium text-gray-700 hover:text-gray-900">
            Cart
            {cart.items.length > 0 && (
              <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
                {cartItemCount(cart)}
              </span>
            )}
          </Link>
          {!hydrated ? null : user ? (
            <div className="flex items-center gap-3 text-sm">
              <Link href="/account/wishlist" className="text-gray-700 hover:text-gray-900">
                Wishlist
              </Link>
              <Link href="/account" className="text-gray-700 hover:text-gray-900">
                {user.firstName}
              </Link>
              {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(user.role.name) && (
                <Link href="/admin" className="text-gray-700 hover:text-gray-900">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/account/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/account/register" className="btn-primary">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
