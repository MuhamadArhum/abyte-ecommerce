'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { Product } from '@/types';
import ProductForm from '@/components/admin/ProductForm';
import VariantManager from '@/components/admin/VariantManager';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  const load = useCallback(() => {
    api.get<Product>(`/products/admin/${params.id}`).then(setProduct);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!product) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Edit Product</h1>
      <ProductForm product={product} />
      <VariantManager product={product} onChange={load} />
    </div>
  );
}
