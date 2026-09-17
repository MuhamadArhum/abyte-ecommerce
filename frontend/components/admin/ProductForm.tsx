'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import type { Product, Category, Brand } from '@/types';

interface ImageRow {
  url: string;
  altText?: string;
  isPrimary?: boolean;
}

interface VariantRow {
  sku: string;
  name: string;
  attributesText: string; // e.g. "color:Red,size:L"
  priceOverride: string;
  stock: string;
}

function parseAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const pair of text.split(',')) {
    const [key, value] = pair.split(':').map((s) => s.trim());
    if (key && value) attrs[key] = value;
  }
  return attrs;
}

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [discountPrice, setDiscountPrice] = useState(product?.discountPrice ?? '');
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? '');
  const [brandId, setBrandId] = useState(product?.brand?.id ?? '');
  const [status, setStatus] = useState(product?.status ?? 'DRAFT');
  const [initialStock, setInitialStock] = useState('0');
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.map((i) => ({ url: i.url, altText: i.altText ?? '', isPrimary: i.isPrimary })) ?? [
      { url: '', isPrimary: true },
    ],
  );
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addVariantRow() {
    setVariants((prev) => [...prev, { sku: '', name: '', attributesText: '', priceOverride: '', stock: '0' }]);
  }

  function updateVariantRow(idx: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  function removeVariantRow(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    api.get<Category[]>('/categories/admin/all').then(setCategories).catch(() => {});
    api.get<Brand[]>('/brands/admin/all').then(setBrands).catch(() => {});
  }, []);

  function updateImage(idx: number, patch: Partial<ImageRow>) {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, ...patch } : img)));
  }

  function addImageRow() {
    setImages((prev) => [...prev, { url: '' }]);
  }

  function removeImageRow(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload: Record<string, unknown> = {
      name,
      sku,
      description,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      status,
      images: images.filter((i) => i.url.trim() !== ''),
    };
    if (!isEdit) {
      payload.initialStock = Number(initialStock);
      const validVariants = variants.filter((v) => v.sku.trim() && v.name.trim());
      if (validVariants.length > 0) {
        payload.variants = validVariants.map((v) => ({
          sku: v.sku,
          name: v.name,
          attributes: parseAttributes(v.attributesText),
          priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          stock: Number(v.stock) || 0,
        }));
      }
    }

    try {
      if (isEdit) {
        await api.patch(`/products/${product!.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      router.push('/admin/products');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save product');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-3xl space-y-4 p-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="prod-name">Name</label>
          <input id="prod-name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="prod-sku">SKU</label>
          <input id="prod-sku" required className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="prod-description">Description</label>
        <textarea id="prod-description" className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="prod-price">Price</label>
          <input id="prod-price" required type="number" min={0} step="0.01" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="prod-discountPrice">Discount price</label>
          <input id="prod-discountPrice" type="number" min={0} step="0.01" className="input" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
        </div>
        {!isEdit && (
          <div>
            <label className="label" htmlFor="prod-initialStock">Initial stock</label>
            <input id="prod-initialStock" type="number" min={0} className="input" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="prod-category">Category</label>
          <select id="prod-category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="prod-brand">Brand</label>
          <select id="prod-brand" className="input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">None</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="prod-status">Status</label>
          <select id="prod-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <span className="label">Images</span>
        <div className="space-y-2">
          {images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                placeholder="Image URL"
                className="input"
                value={img.url}
                onChange={(e) => updateImage(idx, { url: e.target.value })}
              />
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="radio"
                  name="primaryImage"
                  checked={!!img.isPrimary}
                  onChange={() => setImages((prev) => prev.map((im, i) => ({ ...im, isPrimary: i === idx })))}
                />
                Primary
              </label>
              <button type="button" className="text-xs text-red-600" onClick={() => removeImageRow(idx)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="text-sm text-gray-600 underline" onClick={addImageRow}>
            + Add image
          </button>
        </div>
      </div>

      {!isEdit && (
        <div>
          <span className="label">Variants (optional)</span>
          <p className="mb-2 text-xs text-gray-400">
            e.g. attributes: <code>color:Red,size:L</code>. Leave empty for a simple product with no variants.
          </p>
          <div className="space-y-2">
            {variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-5 items-center gap-2 rounded-md border border-gray-200 p-2">
                <input
                  placeholder="Variant SKU"
                  className="input"
                  value={v.sku}
                  onChange={(e) => updateVariantRow(idx, { sku: e.target.value })}
                />
                <input
                  placeholder="Variant name"
                  className="input"
                  value={v.name}
                  onChange={(e) => updateVariantRow(idx, { name: e.target.value })}
                />
                <input
                  placeholder="attributes: color:Red,size:L"
                  className="input"
                  value={v.attributesText}
                  onChange={(e) => updateVariantRow(idx, { attributesText: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Stock"
                  className="input"
                  value={v.stock}
                  onChange={(e) => updateVariantRow(idx, { stock: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Price override"
                    className="input"
                    value={v.priceOverride}
                    onChange={(e) => updateVariantRow(idx, { priceOverride: e.target.value })}
                  />
                  <button type="button" className="text-xs text-red-600" onClick={() => removeVariantRow(idx)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="text-sm text-gray-600 underline" onClick={addVariantRow}>
              + Add variant
            </button>
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
      </button>
    </form>
  );
}
