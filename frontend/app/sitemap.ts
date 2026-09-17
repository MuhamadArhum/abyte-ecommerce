import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/server-api';
import type { PaginatedResponse, Product, Category } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5183';

  const [products, categories] = await Promise.all([
    serverFetch<PaginatedResponse<Product>>('/products?limit=100', 3600),
    serverFetch<Category[]>('/categories', 3600),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const productRoutes: MetadataRoute.Sitemap = (products?.items ?? []).map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: p.createdAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${siteUrl}/products?category=${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
