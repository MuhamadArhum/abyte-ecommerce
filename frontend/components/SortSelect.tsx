'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = `${searchParams.get('sortBy') ?? 'createdAt'}-${searchParams.get('sortDir') ?? 'desc'}`;

  function handleChange(value: string) {
    const [sortBy, sortDir] = value.split('-');
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={current} onChange={(e) => handleChange(e.target.value)} className="input w-auto">
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
