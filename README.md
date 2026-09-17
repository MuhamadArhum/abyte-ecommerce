# Abyte E-Commerce Platform

A full-stack e-commerce / online ordering platform.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** NestJS + TypeScript REST API
- **Database:** MariaDB via Prisma ORM
- **Auth:** JWT access tokens + rotating httpOnly refresh tokens, RBAC
- **Docs:** Swagger/OpenAPI at `/api/v1/docs`

## Project structure

```
abyte-ecommerce/
├── backend/            NestJS REST API
│   ├── prisma/         schema.prisma, seed.ts, migrations
│   ├── src/            feature modules (auth, products, orders, ...)
│   └── test/           e2e tests (Supertest)
├── frontend/           Next.js storefront + admin dashboard
│   ├── app/            App Router pages (storefront, account, admin)
│   ├── components/     shared UI components
│   ├── lib/            API client, auth/cart state, formatting helpers
│   └── types/          shared TypeScript types
├── docker-compose.yml  MariaDB + backend + frontend
├── .env.example        root environment reference
└── docs/               SETUP / ARCHITECTURE / API / DEPLOYMENT guides
```

See [docs/SETUP.md](docs/SETUP.md) to get running locally, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a system overview.

## Quick start (Docker)

```bash
cp .env.example .env
# edit .env and set real JWT secrets + DB password
docker compose up --build
```

- Frontend: http://localhost:5183
- API: http://localhost:3010/api/v1
- Swagger docs: http://localhost:3010/api/v1/docs

## Quick start (local, without Docker)

Requires Node.js 20+ and a running MariaDB 10.6+/11+ instance.

```bash
# Backend
cd backend
cp .env.example .env   # point DATABASE_URL at your MariaDB instance
npm install
npm run prisma:migrate         # creates schema
npm run prisma:seed            # seeds roles + a super admin + sample catalog
npm run start:dev              # http://localhost:3010/api/v1

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                    # http://localhost:5183
```

Default seeded admin login (change immediately in production):
`admin@abyte.local` / `ChangeMe123!` (or the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set).

## Testing

```bash
cd backend
npm test            # unit tests (Jest)
npm run test:e2e    # API e2e tests (Supertest) — requires a migrated MariaDB instance

cd frontend
npm run test:e2e    # browser e2e tests (Playwright) — requires the full stack running
```

## Environment note for this workspace

This repository was scaffolded in a sandboxed environment without Docker or a
local MySQL/MariaDB client available, so the full stack (`docker compose up`,
`prisma migrate`, live API↔DB integration) has **not** been run end-to-end here.
Unit tests, `prisma generate`, `tsc`, `nest build`, and `next build` were all run
and pass. Run the Quick Start above in an environment with Docker or MariaDB to
verify the live database flows before deploying.
