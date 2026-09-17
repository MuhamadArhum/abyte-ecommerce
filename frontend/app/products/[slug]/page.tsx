import Image from 'next/image';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { Product, PaginatedResponse, Review } from '@/types';
import { formatCurrency, formatDate, toSafeJsonLd } from '@/lib/format';
import AddToCartPanel from '@/components/AddToCartPanel';
import ProductCard from '@/components/ProductCard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await serverFetch<Product>(`/products/${slug}`);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.metaDescription || product.description?.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await serverFetch<Product>(`/products/${slug}`, 30);
  if (!product) notFound();

  const [related, reviewsResult] = await Promise.all([
    serverFetch<Product[]>(`/products/${slug}/related`, 60),
    serverFetch<PaginatedResponse<Review>>(`/reviews/product/${product.id}`, 30),
  ]);

  const price = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
  const avgRating = reviewsResult?.items.length
    ? reviewsResult.items.reduce((s, r) => s + r.rating, 0) / reviewsResult.items.length
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      availability:
        (product.inventory?.quantity ?? 0) > 0 || product.variants.some((v) => v.stock > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(avgRating !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviewsResult?.meta.total ?? 0,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(jsonLd) }} />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            {product.images[0] ? (
              <Image src={product.images[0].url} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No image available</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1, 5).map((img) => (
                <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-md bg-gray-100">
                  <Image src={img.url} alt={img.altText ?? product.name} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && <p className="text-sm text-gray-500">{product.brand.name}</p>}
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{product.name}</h1>
          {avgRating !== null && (
            <p className="mt-2 text-sm text-gray-600">
              {'★'.repeat(Math.round(avgRating))}
              {'☆'.repeat(5 - Math.round(avgRating))} ({reviewsResult?.meta.total} reviews)
            </p>
          )}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(price)}</span>
            {product.discountPrice && (
              <span className="text-lg text-gray-400 line-through">{formatCurrency(product.price)}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">SKU: {product.sku}</p>

          {product.description && <p className="mt-4 text-sm leading-relaxed text-gray-700">{product.description}</p>}

          <div className="mt-6 border-t border-gray-200 pt-6">
            <AddToCartPanel product={product} />
          </div>

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Specifications</h2>
              <dl className="divide-y divide-gray-100 text-sm">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2">
                    <dt className="text-gray-500">{key}</dt>
                    <dd className="text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer reviews</h2>
        {reviewsResult && reviewsResult.items.length > 0 ? (
          <ul className="space-y-4">
            {reviewsResult.items.map((review) => (
              <li key={review.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {review.user?.firstName} {review.user?.lastName?.charAt(0)}.
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                {review.title && <p className="mt-1 font-medium text-gray-900">{review.title}</p>}
                {review.body && <p className="mt-1 text-sm text-gray-600">{review.body}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        )}
      </section>

      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
