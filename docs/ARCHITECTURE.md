# Architecture

## Overview

```
┌─────────────┐        HTTPS/JSON        ┌──────────────┐      Prisma      ┌──────────┐
│  Next.js     │ ───────────────────────▶ │   NestJS     │ ────────────────▶ │ MariaDB  │
│  (frontend)  │ ◀─────────────────────── │   REST API   │ ◀──────────────── │          │
└─────────────┘                          └──────────────┘                  └──────────┘
```

The Next.js frontend never talks to MariaDB directly — every read/write goes
through the NestJS REST API, which owns all business rules, validation, and
authorization.

## Backend (NestJS)

Feature modules under `backend/src/`, each following the same shape
(`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`):

| Module | Responsibility |
|---|---|
| `auth` | Register/login/refresh/logout, JWT issuance, password reset, account lockout |
| `users` | Profile, admin user management, role/status changes |
| `addresses` | Customer shipping/billing addresses |
| `categories` / `brands` | Catalog taxonomy, admin CRUD |
| `products` | Catalog CRUD, public search/filter/sort/pagination |
| `inventory` | Stock levels, adjustments, transaction ledger |
| `cart` | Per-user cart, stock-aware add/update/remove |
| `coupons` | Coupon CRUD + server-side validation/discount computation |
| `orders` | Checkout, order lifecycle, status transitions, cancellation |
| `reviews` | Customer reviews with purchase-verification and moderation |
| `wishlist` | Save-for-later, move-to-cart |
| `notifications` | In-app notifications |
| `audit-logs` | Admin action audit trail |
| `dashboard` | Aggregated admin statistics |

Cross-cutting concerns live in `common/`:

- `guards/jwt-auth.guard.ts` + `guards/roles.guard.ts` — applied globally via
  `APP_GUARD`, so every endpoint requires authentication and role checks by
  default. Use `@Public()` to opt an endpoint out, and `@Roles(...)` to
  restrict it to specific roles.
- `filters/http-exception.filter.ts` — normalizes all errors (including
  Prisma errors) into a consistent JSON shape.
- `interceptors/transform.interceptor.ts` — wraps every success response as
  `{ success: true, data }`.

### Authentication model

- **Access token:** short-lived JWT (default 15m), returned in the response
  body, sent by the frontend as `Authorization: Bearer <token>`.
- **Refresh token:** opaque random value, HMAC-hashed before storage, set as
  an `httpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`. Rotated on
  every use (old token revoked, new one issued) — see `RefreshToken` model.
- Because mutating API calls require the Bearer token (not just the cookie),
  a CSRF attempt against `/auth/refresh` cannot exfiltrate the new access
  token cross-origin (blocked by CORS + SOP).

### Money-critical flows

Cart totals, coupon discounts, shipping, and tax are **always recomputed
server-side** at checkout (`orders/orders.service.ts#checkout`) from the
current product price and stock — the client-submitted cart is never trusted
for pricing. Stock decrements use conditional atomic updates
(`WHERE quantity >= x`) inside a Prisma transaction so concurrent checkouts
cannot oversell a product.

## Frontend (Next.js App Router)

- Public storefront pages (`/`, `/products`, `/products/[slug]`) are React
  Server Components that fetch directly from the public REST API
  (`lib/server-api.ts`) for SEO and fast first paint.
- Authenticated pages (`/cart`, `/checkout`, `/account/*`, `/admin/*`) are
  client components. Session state lives in a Zustand store
  (`lib/auth-store.ts`); the access token is kept in memory only (never
  `localStorage`) to reduce XSS blast radius, and is silently re-hydrated on
  page load via the httpOnly refresh cookie (`components/AuthProvider.tsx`).
- `lib/api-client.ts` centralizes fetch calls, attaches the bearer token,
  and transparently retries once via `/auth/refresh` on a 401.

## Database (MariaDB + Prisma)

Schema: `backend/prisma/schema.prisma`. Highlights:

- `Order`/`OrderItem` store **snapshots** of price, name, SKU, and the
  shipping/billing address at the time of purchase, so later catalog or
  address edits never retroactively change historical orders.
- `Inventory` + `InventoryTransaction` give a fully traceable stock ledger;
  every mutation (`RESTOCK`, `SALE`, `RETURN`, `ADJUSTMENT`) is logged with
  who performed it.
- `RefreshToken`, `Role`/`Permission`/`RolePermission` back authentication
  and RBAC.
- Foreign keys use `onDelete: Cascade`/`SetNull` deliberately per relation
  (e.g. deleting a category nulls out `Product.categoryId` rather than
  deleting products; deleting a user cascades their cart/wishlist/addresses).

## Order status lifecycle

```
PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → DELIVERED → REFUNDED
   ↓           ↓            ↓          ↓
CANCELLED (customer, while PENDING/CONFIRMED, or admin at any pre-shipped stage)
```

Transitions are enforced server-side (`ALLOWED_TRANSITIONS` map in
`orders.service.ts`); cancelling restocks inventory automatically.
