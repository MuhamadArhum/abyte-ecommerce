import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/format';

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const price = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
  const hasDiscount = !!product.discountPrice;
  const inStock = (product.inventory?.quantity ?? 0) > 0 || product.variants.some((v) => v.stock > 0);

  return (
    <Link href={`/products/${product.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">No image</div>
        )}
        {!inStock && (
          <span className="absolute left-2 top-2 rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && <span className="text-xs text-gray-500">{product.brand.name}</span>}
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <span className="font-semibold text-gray-900">{formatCurrency(price)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
