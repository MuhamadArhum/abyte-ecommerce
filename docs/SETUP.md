# Setup Guide

## Prerequisites

- Node.js 20+
- MariaDB 10.6+ (or 11.x), or Docker + Docker Compose
- npm 10+

## 1. Database

### Option A — Docker

```bash
docker compose up -d mariadb
```

### Option B — Existing MariaDB instance

Create a database and user:

```sql
CREATE DATABASE abyte_ecommerce CHARACTER SET utf8mb4;
CREATE USER 'abyte'@'%' IDENTIFIED BY 'abyte_password';
GRANT ALL PRIVILEGES ON abyte_ecommerce.* TO 'abyte'@'%';
FLUSH PRIVILEGES;
```

## 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — MariaDB connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 64`
- `CORS_ORIGIN` — the frontend origin (e.g. `http://localhost:3000`)

```bash
npm install
npm run prisma:migrate       # applies schema, prompts for a migration name on first run
npm run prisma:seed          # seeds roles, permissions, super admin, sample catalog
npm run start:dev
```

The API listens on `http://localhost:4000/api/v1` by default, with Swagger
docs at `/api/v1/docs`.

## 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The storefront runs on `http://localhost:3000`. `NEXT_PUBLIC_API_URL` must
point at the backend's API prefix (`http://localhost:4000/api/v1`).

## 4. Verifying the install

1. Visit `http://localhost:3000` — homepage should load (empty catalog sections
   until you seed or add products).
2. Visit `http://localhost:4000/api/v1/docs` — Swagger UI should list all endpoints.
3. Log in to `/account/login` with the seeded super admin, then visit `/admin`
   to confirm the dashboard loads.
4. Create a category, brand, and product from `/admin/products/new`, then confirm
   it appears on the storefront `/products` page once its status is "Published".

## 5. Running tests

```bash
cd backend
npm test          # unit tests, no DB required
npm run test:e2e  # requires a migrated database reachable via DATABASE_URL
```

## Troubleshooting

- **`P1001: Can't reach database server`** — confirm MariaDB is running and
  `DATABASE_URL` host/port/credentials are correct.
- **CORS errors in the browser** — confirm `CORS_ORIGIN` in the backend `.env`
  matches the frontend's origin exactly (scheme + host + port).
- **401 loops on the frontend** — the refresh cookie is scoped to
  `/api/v1/auth`; if you changed `API_PREFIX`, update `REFRESH_COOKIE_PATH` in
  `backend/src/auth/auth.controller.ts` to match.
