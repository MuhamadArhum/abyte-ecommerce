# Abyte E-Commerce — System Guide

## Overview

Abyte E-Commerce is a full-stack e-commerce / online ordering platform made up of a NestJS REST API backend and a Next.js storefront-plus-admin frontend, backed by a MariaDB database accessed through Prisma. It supports a public storefront (browse categories/brands/products, cart, checkout, reviews, wishlist), a customer account area (addresses, orders, wishlist, password reset), and an admin dashboard (products, categories, brands, coupons, inventory, orders, reviews, users) with JWT-based authentication and role-based access control (SUPER_ADMIN/ADMIN/MANAGER/STAFF/CUSTOMER).

## Tech Stack

**Backend** (`backend/`, package name `abyte-backend`, TypeScript):
- NestJS 10 (`@nestjs/common` ^10.4.22, `@nestjs/core` ^10.4.15, `@nestjs/platform-express` ^10.4.15)
- `@nestjs/config` ^3.3.0, `@nestjs/jwt` ^10.2.0, `@nestjs/passport` ^10.0.3 with `passport` ^0.7.0, `passport-jwt` ^4.0.1, `passport-local` ^1.0.0
- `@nestjs/swagger` ^7.4.2 (OpenAPI/Swagger docs)
- `@nestjs/throttler` ^6.2.1 (rate limiting)
- Prisma ORM: `@prisma/client` ^5.22.0 / `prisma` ^5.22.0
- `bcrypt` ^6.0.0 (password hashing), `class-validator` ^0.14.1 / `class-transformer` ^0.5.1 (DTO validation), `helmet` ^8.0.0, `cookie-parser` ^1.4.7, `slugify` ^1.6.6
- Test tooling: Jest ^29.7.0, ts-jest, Supertest ^7.0.0 (e2e)
- Node.js 20 (per Dockerfile `node:20-alpine`), TypeScript ^5.7.2

**Frontend** (`frontend/`, package name `abyte-frontend`, TypeScript):
- Next.js 15.5.25 (App Router) — README describes it as "Next.js 14" but the installed/declared version in `package.json` is 15.5.25
- React ^18.3.1 / React DOM ^18.3.1
- Zustand ^4.5.5 (client state: auth store, cart store)
- Tailwind CSS ^3.4.16, PostCSS ^8.5.6, autoprefixer ^10.4.20
- `js-cookie` ^3.0.5
- Playwright ^1.56.0 (browser e2e tests)
- TypeScript ^5.7.2

**Database**: MariaDB 11.4 (via Docker image `mariadb:11.4` in docker-compose; docs say MariaDB 10.6+/11+ also supported).

**Infra**: Docker + Docker Compose (three services: `mariadb`, `backend`, `frontend`), separate Dockerfiles for backend and frontend.

## Architecture & Modules

This is **not** a monolith — it is a two-service architecture (separate backend API and frontend app) plus a database service, orchestrated together via `docker-compose.yml` at the repo root. The frontend never talks to the database directly; all reads/writes go through the NestJS REST API.

```
Next.js frontend  --HTTPS/JSON-->  NestJS REST API  --Prisma-->  MariaDB
```

### Backend (`backend/src/`) — NestJS feature modules, each with `*.module.ts` / `*.controller.ts` / `*.service.ts` / `dto/`:
- `auth` — register/login/refresh/logout, JWT issuance (access + rotating httpOnly refresh tokens), password reset, account lockout
- `users` — profile management, admin user management, role/status changes
- `addresses` — customer shipping/billing addresses
- `categories`, `brands` — catalog taxonomy with admin CRUD
- `products` — catalog CRUD, public search/filter/sort/pagination
- `inventory` — stock levels, adjustments, transaction ledger
- `cart` — per-user cart, stock-aware add/update/remove
- `coupons` — coupon CRUD plus server-side validation and discount computation
- `orders` — checkout, order lifecycle/status transitions, cancellation (server-side recomputation of totals; atomic stock decrements in a Prisma transaction to prevent overselling)
- `reviews` — customer reviews with purchase verification and moderation
- `wishlist` — save-for-later, move-to-cart
- `notifications` — in-app notifications
- `audit-logs` — admin action audit trail
- `dashboard` — aggregated admin statistics
- `common/` — cross-cutting guards (`jwt-auth.guard.ts`, `roles.guard.ts` applied globally via `APP_GUARD`), `filters/http-exception.filter.ts` (normalizes errors), `interceptors/transform.interceptor.ts` (wraps success responses as `{ success, data }`)
- `config/` — `configuration.ts` (env-driven app config: port, CORS origin, JWT, bcrypt rounds, etc.)
- `prisma/` — `PrismaService` wrapper around the Prisma client

Authentication model: short-lived JWT access token (default 15m) returned in the response body and sent as `Authorization: Bearer <token>`; an opaque, HMAC-hashed, rotating refresh token stored as an `httpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`.

### Frontend (`frontend/app/` — App Router)
- Public storefront (`/`, `/products`, `/products/[slug]`) — React Server Components fetching directly from the public REST API via `lib/server-api.ts`
- Account area (`app/account/`) — login, register, forgot/reset password, addresses, orders, wishlist
- Cart & checkout (`app/cart/`, `app/checkout/`)
- Admin dashboard (`app/admin/`) — brands, categories, coupons, inventory, orders, products, reviews, users
- `components/` — shared UI (`Navbar`, `Footer`, `ProductCard`, `ProductFilters`, `SearchBox`, `SortSelect`, `Pagination`, `AddToCartPanel`, `AddressForm`, `AuthProvider`, `StatCard`, `LoadingState`) plus `components/admin/` for admin-specific UI
- `lib/` — `api-client.ts` (client-side fetch wrapper, attaches bearer token, retries once on 401 via `/auth/refresh`), `server-api.ts` (server-side fetch for RSCs), `auth-store.ts` / `cart-store.ts` (Zustand stores — access token kept in memory only, never `localStorage`), `format.ts` (formatting helpers)
- `types/` — shared TypeScript types
- `e2e/` — Playwright end-to-end tests

## Database

- **Type**: MariaDB (MySQL-compatible), provider `mysql` in Prisma
- **ORM**: Prisma 5 (`@prisma/client`), schema at `backend/prisma/schema.prisma`, migrations in `backend/prisma/migrations/`, seed script `backend/prisma/seed.ts`
- **Connection config**: `DATABASE_URL` env var (set in `backend/.env`, referenced by `backend/prisma/schema.prisma` via `env("DATABASE_URL")`); in Docker it's composed from `MARIADB_USER`/`MARIADB_PASSWORD`/`MARIADB_DATABASE` pointed at the `mariadb` service on port 3306 (unchanged — this is the database's own port, not touched by this reconfiguration)
- **Key models** (from `schema.prisma`): `Role`, `Permission`, `RolePermission`, `User`, `RefreshToken`, `Address`, `Category`, `Brand`, `Product`, `ProductImage`, `ProductVariant`, `Inventory`, `InventoryTransaction`, `Cart`, `CartItem`, `Order`, `OrderStatusHistory`, `OrderItem`, `Payment`, `Coupon`, `CouponUsage`, `Review`, `Wishlist`, `WishlistItem`, `Notification`, `AuditLog`, `Setting`
- Notable design choices: `Order`/`OrderItem` store price/name/SKU/address **snapshots** at time of purchase; `Inventory` + `InventoryTransaction` form a full stock ledger; foreign keys use `Cascade`/`SetNull` deliberately per relation.

## Location

- Repo root: `D:\abyte-ecommerce`
- Backend folder: `D:\abyte-ecommerce\backend`
- Frontend folder: `D:\abyte-ecommerce\frontend`

## Ports

This app has a separate frontend and backend, so both were assigned distinct ports:

- **Backend (NestJS API): 3010** (was 4000)
- **Frontend (Next.js): 5183** (was 3000)
- Database (MariaDB, unrelated shared service) remains on port **3306** (host-mapped 3306 in Docker; local `backend/.env` example connects to `127.0.0.1:3307` for a locally-forwarded instance) — left untouched per instructions.

## Environment Variables

**Backend** (`backend/.env`, `backend/.env.example`, and mirrored in root `.env.example`):
- `DATABASE_URL` — MariaDB connection string (real secret value preserved in `backend/.env`, not modified)
- `PORT` — now `3010`
- `NODE_ENV` — `development` / `production`
- `API_PREFIX` — `api/v1`
- `CORS_ORIGIN` — now `http://localhost:5183` (comma-separated list supported)
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` — JWT access token secret/lifetime (secret preserved)
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` — JWT refresh token secret/lifetime (secret preserved)
- `BCRYPT_SALT_ROUNDS` — password hashing cost
- `THROTTLE_TTL`, `THROTTLE_LIMIT` — rate limiting window/limit
- `TRUST_PROXY` — whether to trust `X-Forwarded-*` headers (reverse proxy)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — credentials created by `prisma:seed`

**Frontend** (`frontend/.env.local`, `frontend/.env.example`):
- `NEXT_PUBLIC_API_URL` — now `http://localhost:3010/api/v1`
- `NEXT_PUBLIC_SITE_URL` — now `http://localhost:5183`
- `NEXT_PUBLIC_IMAGE_HOSTS` — optional comma-separated list of extra allowed `next/image` remote hosts

**Docker Compose** (`docker-compose.yml`, root `.env.example`): `MARIADB_ROOT_PASSWORD`, `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD` for the database container, plus the backend/frontend variables above passed through as container environment.

No `.env` file's existing secret values (JWT secrets, DB password, seed admin password) were changed — only the `PORT`/`CORS_ORIGIN`/`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL` keys were added or updated.

## How to Run

### Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Dev mode (backend and frontend run separately, in two terminals)

Backend (runs on port 3010):
```bash
cd backend
npm run prisma:migrate     # first time only — applies schema
npm run prisma:seed        # optional — seeds roles/permissions/admin/sample catalog
npm run start:dev          # http://localhost:3010/api/v1  (Swagger at /api/v1/docs)
```

Frontend (runs on port 5183):
```bash
cd frontend
npm run dev                # http://localhost:5183
```

### Build
```bash
cd backend && npm run build      # nest build -> backend/dist
cd frontend && npm run build     # next build
```

### Production start
```bash
cd backend && npm run start:prod   # node dist/main  (respects PORT env, defaults to 3010)
cd frontend && npm run start       # next start -p 5183
```

### Docker Compose (full stack: MariaDB + backend + frontend)
```bash
cp .env.example .env   # edit JWT secrets + DB password
docker compose up --build
# Frontend: http://localhost:5183
# API:      http://localhost:3010/api/v1
# Swagger:  http://localhost:3010/api/v1/docs
```

### Tests
```bash
cd backend && npm test            # unit tests (Jest), no DB required
cd backend && npm run test:e2e    # Supertest e2e, requires a migrated MariaDB instance
cd frontend && npm run test:e2e   # Playwright e2e, requires the full stack running (E2E_BASE_URL defaults to http://localhost:5183)
```

## Notes

- The project's own README states the frontend is "Next.js 14", but `frontend/package.json` actually declares/pins `next: 15.5.25`. This guide reports the version found in `package.json` as the source of truth.
- Backend and frontend ports were reassigned from their original defaults (backend 4000 → **3010**, frontend 3000 → **5183**) per this task's port-standardization requirement. Updated files: `backend/.env`, `backend/.env.example`, `.env.example` (root), `backend/src/config/configuration.ts`, `backend/src/main.ts`, `backend/test/app.e2e-spec.ts`, `backend/Dockerfile`, `frontend/.env.example`, `frontend/.env.local`, `frontend/lib/api-client.ts`, `frontend/lib/server-api.ts`, `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `frontend/playwright.config.ts`, `frontend/Dockerfile`, `frontend/package.json` (dev/start scripts now pass `-p 5183`), `docker-compose.yml` (port mappings and CORS/API-URL defaults), plus `README.md`, `docs/SETUP.md`, and `docs/API.md` for documentation accuracy.
- The MariaDB database port (3306 in Docker; 3307 in the pre-existing `backend/.env` local override) was intentionally left unchanged, since it is a shared/unrelated service port, not this app's own HTTP server port.
- No `npm install` was run and no dev servers were started as part of this task, per instructions — only source/config files were edited and this guide was written. The change has not been runtime-verified; a quick `npm run start:dev` / `npm run dev` check is recommended before relying on it.
- There is a pre-existing top-level `.env` file mentioned nowhere except `backend/.env` — the repo root itself has only `.env.example` (no root `.env`); Docker Compose expects a root `.env` to be created from it (`cp .env.example .env`) before `docker compose up`.
- `backend/dist/` contains a stale compiled build (with the old hardcoded port-4000/3000 defaults baked in from a prior `nest build`); it will be regenerated correctly the next time `npm run build` runs against the updated source. It was not hand-edited since it is build output, not source.
