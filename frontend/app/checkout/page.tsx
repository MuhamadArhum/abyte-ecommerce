'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useCartStore } from '@/lib/cart-store';
import { api, ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import type { Address, Order } from '@/types';
import AddressForm, { AddressFormValues } from '@/components/AddressForm';
import { EmptyState } from '@/components/LoadingState';

type PaymentMethod = 'COD' | 'CARD' | 'PAYPAL';

export default function CheckoutPage() {
  const { user, hydrated } = useAuthStore();
  const { cart, refresh } = useCartStore();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [billingId, setBillingId] = useState<number | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (hydrated && !user) {
      router.push('/account/login?next=/checkout');
      return;
    }
    if (user) {
      refresh();
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  async function loadAddresses() {
    const list = await api.get<Address[]>('/addresses');
    setAddresses(list);
    const def = list.find((a) => a.isDefault) ?? list[0];
    if (def) {
      setShippingId(def.id);
      setBillingId(def.id);
    } else {
      setShowNewAddress(true);
    }
  }

  async function handleAddAddress(values: AddressFormValues) {
    const created = await api.post<Address>('/addresses', values);
    setAddresses((prev) => [...prev, created]);
    setShippingId(created.id);
    setBillingId(created.id);
    setShowNewAddress(false);
  }

  async function applyCoupon() {
    setCouponError(null);
    try {
      const result = await api.post<{ discount: number }>('/coupons/validate', { code: couponCode });
      setDiscount(result.discount);
    } catch (e) {
      setDiscount(0);
      setCouponError(e instanceof ApiError ? e.message : 'Invalid coupon');
    }
  }

  async function handlePlaceOrder() {
    if (!shippingId) {
      setError('Please select or add a shipping address');
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const order = await api.post<Order>('/orders', {
        shippingAddressId: shippingId,
        billingAddressId: sameAsShipping ? shippingId : billingId,
        paymentMethod,
        couponCode: couponCode || undefined,
      });
      router.push(`/account/orders/${order.id}?placed=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  if (!hydrated || !user) return null;
  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Your cart is empty" message="Add items to your cart before checking out." />
      </div>
    );
  }

  const shippingEstimate = cart.subtotal - discount >= 100 || cart.subtotal - discount <= 0 ? 0 : 10;
  const grandTotal = Math.max(0, cart.subtotal - discount) + shippingEstimate;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Checkout</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Shipping address</h2>
            {addresses.length > 0 && !showNewAddress && (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <label key={addr.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 text-sm">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingId === addr.id}
                      onChange={() => setShippingId(addr.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-gray-900">{addr.fullName}</span>
                      {addr.line1}, {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                    </span>
                  </label>
                ))}
                <button className="text-sm text-gray-600 underline" onClick={() => setShowNewAddress(true)}>
                  + Add a new address
                </button>
              </div>
            )}
            {showNewAddress && (
              <AddressForm
                onSubmit={handleAddAddress}
                onCancel={addresses.length > 0 ? () => setShowNewAddress(false) : undefined}
              />
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Billing address</h2>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} />
              Same as shipping address
            </label>
            {!sameAsShipping && (
              <div className="mt-3 space-y-2">
                {addresses.map((addr) => (
                  <label key={addr.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 text-sm">
                    <input
                      type="radio"
                      name="billing"
                      checked={billingId === addr.id}
                      onChange={() => setBillingId(addr.id)}
                      className="mt-1"
                    />
                    <span>
                      {addr.fullName} — {addr.line1}, {addr.city}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Payment method</h2>
            <div className="space-y-2 text-sm">
              {(['COD', 'CARD', 'PAYPAL'] as PaymentMethod[]).map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  {method === 'COD' ? 'Cash on Delivery' : method === 'CARD' ? 'Credit / Debit Card' : 'PayPal'}
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Order Summary</h2>
          <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span className="text-gray-600">
                  {item.name} × {item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mb-3 flex gap-2">
            <input
              placeholder="Coupon code"
              className="input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button className="btn-secondary" onClick={applyCoupon} type="button">
              Apply
            </button>
          </div>
          {couponError && <p className="mb-2 text-xs text-red-600">{couponError}</p>}

          <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>{shippingEstimate === 0 ? 'Free' : formatCurrency(shippingEstimate)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button className="btn-primary mt-4 w-full" disabled={placing} onClick={handlePlaceOrder}>
            {placing ? 'Placing order...' : 'Place order'}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            Totals are recalculated securely on the server at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
