export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: string;
  role: { name: RoleName };
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: number | null;
  children?: Category[];
  status: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  status: string;
}

export interface ProductImage {
  id: number;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  priceOverride?: string | null;
  stock: number;
}

export interface Inventory {
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  specifications?: Record<string, unknown> | null;
  sku: string;
  price: string;
  discountPrice?: string | null;
  status: string;
  category?: Category | null;
  brand?: Brand | null;
  images: ProductImage[];
  variants: ProductVariant[];
  inventory?: Inventory | null;
  reviews?: Review[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
}

export interface Review {
  id: number;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export interface CartItem {
  id: number;
  productId: number;
  variantId?: number | null;
  name: string;
  slug: string;
  image: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  inStock: boolean;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
}

export interface Address {
  id: number;
  type: 'SHIPPING' | 'BILLING';
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  nameSnapshot: string;
  skuSnapshot: string;
  priceSnapshot: string;
  quantity: number;
  lineTotal: string;
  product?: { name: string; slug: string };
}

export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  grandTotal: string;
  items: OrderItem[];
  statusHistory: { status: string; note?: string | null; createdAt: string }[];
  shippingAddress: Address;
  billingAddress: Address;
  coupon?: { code: string } | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Coupon {
  id: number;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: string;
  active: boolean;
  usageLimit?: number | null;
  usageCount: number;
  expiresAt?: string | null;
}
