import { create } from 'zustand';
import type { Cart } from '@/types';
import { api } from './api-client';

interface CartState {
  cart: Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity: number, variantId?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: { items: [], subtotal: 0 },
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const cart = await api.get<Cart>('/cart');
      set({ cart });
    } finally {
      set({ loading: false });
    }
  },
  addItem: async (productId, quantity, variantId) => {
    const cart = await api.post<Cart>('/cart/items', { productId, quantity, variantId });
    set({ cart });
  },
  updateItem: async (itemId, quantity) => {
    const cart = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity });
    set({ cart });
  },
  removeItem: async (itemId) => {
    const cart = await api.delete<Cart>(`/cart/items/${itemId}`);
    set({ cart });
  },
  clear: async () => {
    const cart = await api.delete<Cart>('/cart');
    set({ cart });
  },
}));

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
