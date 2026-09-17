'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Category, Brand } from '@/types';

export default function ProductFilters({ categories, brands }: { categories: Category[]; brands: Brand[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPriceFilter() {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('minPrice', minPrice);
    else params.delete('minPrice');
    if (maxPrice) params.set('maxPrice', maxPrice);
    else params.delete('maxPrice');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeCategory = searchParams.get('category');
  const activeBrand = searchParams.get('brand');
  const inStockOnly = searchParams.get('inStockOnly') === 'true';

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Category</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              onClick={() => updateParam('category', null)}
              className={!activeCategory ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}
            >
              All
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => updateParam('category', c.slug)}
                className={activeCategory === c.slug ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Brand</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              onClick={() => updateParam('brand', null)}
              className={!activeBrand ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}
            >
              All
            </button>
          </li>
          {brands.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => updateParam('brand', b.slug)}
                className={activeBrand === b.slug ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input"
          />
        </div>
        <button onClick={applyPriceFilter} className="btn-secondary mt-2 w-full">
          Apply
        </button>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam('inStockOnly', e.target.checked ? 'true' : null)}
          />
          In stock only
        </label>
      </div>
    </aside>
  );
}
