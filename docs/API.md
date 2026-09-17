# API Reference

Full interactive documentation is generated at runtime via Swagger:
**`GET /api/v1/docs`**.

Base URL: `http://localhost:4000/api/v1` (configurable via `API_PREFIX`).

All responses are wrapped as `{ "success": true, "data": ... }` on success,
or `{ "success": false, "statusCode", "error", "message", "path", "timestamp" }`
on failure.

## Auth (`/auth`) — public unless noted

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create a customer account, returns access token + sets refresh cookie |
| POST | `/auth/login` | Authenticate, returns access token + sets refresh cookie |
| POST | `/auth/refresh` | Exchange the refresh cookie for a new token pair |
| POST | `/auth/logout` | Revoke the current refresh token (auth required) |
| POST | `/auth/logout-all` | Revoke all of the user's refresh tokens (auth required) |
| POST | `/auth/change-password` | Change password, revokes all sessions (auth required) |
| POST | `/auth/forgot-password` | Request a password reset token |
| POST | `/auth/reset-password` | Complete a password reset |

## Catalog

- `GET /categories`, `GET /categories/:slug` — public
- `GET /brands`, `GET /brands/:slug` — public
- `GET /products?search=&category=&brand=&minPrice=&maxPrice=&inStockOnly=&sortBy=&sortDir=&page=&limit=` — public
- `GET /products/:slug`, `GET /products/:slug/related` — public
- Admin-only (role `MANAGER`+): `POST/PATCH/DELETE /products`, `/categories`, `/brands`,
  plus `admin/all` and `admin/:id` listing variants.
- Variant management (role `MANAGER`+): `POST /products/:id/variants`,
  `PATCH /products/:id/variants/:variantId`, `PATCH /products/:id/variants/:variantId/stock`
  (`{ quantity, reason }`, atomic and never allows negative stock), `DELETE /products/:id/variants/:variantId`.

## Cart & Checkout (auth required)

- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart`
- `POST /coupons/validate` — dry-run a coupon against the current cart
- `POST /orders` — checkout (recomputes all totals server-side)
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/cancel`

## Admin order management (role `STAFF`+)

- `GET /orders/admin/all`
- `PATCH /orders/:id/status` — enforced status-transition state machine

## Inventory (role `STAFF`+ to view, `MANAGER`+ to mutate)

- `GET /inventory`, `GET /inventory/:productId`, `GET /inventory/:productId/transactions`
- `PATCH /inventory/:productId/adjust` — `{ quantity, type, reason }`
- `PATCH /inventory/:productId/threshold`

## Coupons (role `MANAGER`+ to manage)

- `GET/POST/PATCH/DELETE /coupons`
- `POST /coupons/validate` (any authenticated user, scoped to their own cart)

## Reviews

- `GET /reviews/product/:productId` — public, approved only
- `POST /reviews` — auth required, only for delivered purchases
- `PATCH/DELETE /reviews/:id` — owner or admin
- `GET /reviews/pending`, `PATCH /reviews/:id/moderate` — role `MANAGER`+

## Wishlist (auth required)

- `GET /wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`, `POST /wishlist/:productId/move-to-cart`

## Users & Addresses (auth required)

- `GET/PATCH /users/me`
- `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`
- Admin: `GET /users`, `GET /users/:id`, `PATCH /users/:id/status`, `PATCH /users/:id/role` (role `SUPER_ADMIN` for role changes)

## Dashboard & Audit (role `MANAGER`+ / `ADMIN`+)

- `GET /dashboard/summary`
- `GET /audit-logs`

## Roles

`SUPER_ADMIN > ADMIN > MANAGER > STAFF > CUSTOMER`. Every endpoint requires
authentication by default (global `JwtAuthGuard`); `@Public()` opts specific
routes out, and `@Roles(...)` restricts routes to specific roles on top of
authentication.
