import { serverFetch } from '@/lib/server-api';
import type { Category, Brand, PaginatedResponse, Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import Pagination from '@/components/Pagination';
import SortSelect from '@/components/SortSelect';
import SearchBox from '@/components/SearchBox';
import { EmptyState } from '@/components/LoadingState';

export const metadata = { title: 'Shop all products' };

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = new URLSearchParams();
  const page = Number(searchParams.page ?? '1');
  params.set('page', String(page));
  params.set('limit', '20');
  if (searchParams.search) params.set('search', searchParams.search);
  if (searchParams.category) params.set('category', searchParams.category);
  if (searchParams.brand) params.set('brand', searchParams.brand);
  if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
  if (searchParams.inStockOnly) params.set('inStockOnly', searchParams.inStockOnly);
  params.set('sortBy', searchParams.sortBy ?? 'createdAt');
  params.set('sortDir', searchParams.sortDir ?? 'desc');

  const [result, categories, brands] = await Promise.all([
    serverFetch<PaginatedResponse<Product>>(`/products?${params.toString()}`, 0),
    serverFetch<Category[]>('/categories'),
    serverFetch<Brand[]>('/brands'),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">All Products</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox />
          <SortSelect />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <ProductFilters categories={categories ?? []} brands={brands ?? []} />

        <div>
          {!result || result.items.length === 0 ? (
            <EmptyState title="No products found" message="Try adjusting your filters or search terms." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={result.meta.page} totalPages={result.meta.totalPages} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
