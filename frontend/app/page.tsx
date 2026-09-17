import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import ProductCard from '@/components/ProductCard';
import type { Category, Brand, PaginatedResponse, Product } from '@/types';

export const revalidate = 60;

export default async function HomePage() {
  const [categories, brands, newest, deals] = await Promise.all([
    serverFetch<Category[]>('/categories'),
    serverFetch<Brand[]>('/brands'),
    serverFetch<PaginatedResponse<Product>>('/products?limit=8&sortBy=createdAt&sortDir=desc'),
    serverFetch<PaginatedResponse<Product>>('/products?limit=8&sortBy=price&sortDir=asc'),
  ]);

  return (
    <div>
      <section className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:px-8">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Everything you need, delivered to your door.
          </h1>
          <p className="max-w-xl text-lg text-gray-300">
            Discover curated electronics, apparel, and more — with fast shipping and easy returns.
          </p>
          <Link href="/products" className="btn-primary bg-white text-gray-900 hover:bg-gray-200">
            Shop now
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(categories ?? []).slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="card flex flex-col items-center justify-center gap-2 p-6 text-center hover:border-gray-400"
            >
              <span className="font-medium text-gray-900">{category.name}</span>
            </Link>
          ))}
          {(!categories || categories.length === 0) && (
            <p className="col-span-full text-sm text-gray-500">
              No categories yet — add some from the admin dashboard.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New arrivals</h2>
          <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(newest?.items ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {(!newest || newest.items.length === 0) && (
            <p className="col-span-full text-sm text-gray-500">No products published yet.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Best value picks</h2>
          <Link href="/products?sortBy=price&sortDir=asc" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(deals?.items ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {brands && brands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Popular brands</h2>
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/products?brand=${brand.slug}`} className="card px-4 py-2 text-sm font-medium hover:border-gray-400">
                {brand.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
