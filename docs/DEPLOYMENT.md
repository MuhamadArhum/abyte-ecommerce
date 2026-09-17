# Deployment Guide

## Docker Compose (single host)

```bash
cp .env.example .env
# Set strong values for: MARIADB_ROOT_PASSWORD, MARIADB_PASSWORD,
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, NEXT_PUBLIC_API_URL
docker compose up --build -d
docker compose exec backend npm run prisma:seed   # first deploy only
```

The backend container runs `prisma migrate deploy` automatically on start
(see `docker-compose.yml`), so schema changes apply on every deploy without
manual intervention.

## Environment variables (production checklist)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Use a managed MariaDB instance with backups enabled |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 64+ bytes of random data (`openssl rand -hex 64`), rotate periodically |
| `CORS_ORIGIN` | Exact production frontend origin, no wildcards |
| `NODE_ENV=production` | Enables `secure` cookies (HTTPS-only) |
| `NEXT_PUBLIC_API_URL` | Public HTTPS URL of the backend |
| `BCRYPT_SALT_ROUNDS` | 12 is a reasonable default; do not go below 10 |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Tune per expected traffic to mitigate brute force / scraping |

**Never commit `.env` files.** Only `.env.example` files belong in version
control.

## HTTPS & reverse proxy

Both the frontend and backend expect to run behind a TLS-terminating reverse
proxy (e.g. nginx, Caddy, or a cloud load balancer) in production. With
`NODE_ENV=production`, refresh-token cookies are marked `secure`, so the app
**must** be served over HTTPS or logins will silently fail to persist.

## Database migrations

- Development: `npm run prisma:migrate` (interactive, creates a new migration)
- Production: `npm run prisma:migrate:deploy` (applies pending migrations only,
  non-interactive — this is what the Docker image runs on boot)

Never run `prisma db push` against a production database — always go through
versioned migrations so schema history is auditable and reversible.

## Zero-downtime considerations

- Run backend replicas behind a load balancer; the API is stateless aside from
  the database (no in-memory session state), so horizontal scaling is safe.
- Apply migrations before rolling out new backend versions that depend on
  schema changes; keep additive migrations backward-compatible with the
  previous release during rolling deploys.

## Monitoring & logging

- NestJS's built-in `Logger` writes structured logs to stdout — ship these to
  your platform's log aggregator (CloudWatch, Loki, Datadog, etc.).
- Add an uptime check against `GET /api/v1/products` (public, DB-backed) to
  catch both application and database outages.

## Backups

- Schedule regular MariaDB backups (mysqldump or your provider's automated
  snapshots) — orders, inventory transactions, and audit logs are the most
  business-critical tables to protect.

## Known gap in this environment

This project was assembled in a sandboxed development environment without
Docker or a MariaDB client available, so `docker compose up`, live
`prisma migrate deploy` against a real database, and the Supertest e2e suite
have **not** been executed here. Before your first production deploy, run
through `docs/SETUP.md` end-to-end in an environment with Docker/MariaDB to
confirm the full stack behaves as expected.
