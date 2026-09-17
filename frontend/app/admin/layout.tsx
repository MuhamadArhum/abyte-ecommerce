'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && (!user || !ADMIN_ROLES.includes(user.role.name))) {
      router.push('/');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user || !ADMIN_ROLES.includes(user.role.name)) {
    return <div className="p-8 text-sm text-gray-500">Loading admin dashboard...</div>;
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="w-48 flex-shrink-0 space-y-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              pathname === link.href ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
