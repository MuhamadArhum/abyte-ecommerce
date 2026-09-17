'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => goTo(page - 1)}>
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>
        Next
      </button>
    </div>
  );
}
