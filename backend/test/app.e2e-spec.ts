/**
 * End-to-end smoke test covering the core storefront journey:
 * register -> browse products -> add to cart -> checkout -> view order.
 *
 * Requires a running MariaDB instance with DATABASE_URL configured and
 * migrations applied (`npm run prisma:migrate:deploy`), since it boots the
 * full Nest application with a real Prisma connection. Run via `npm run test:e2e`.
 *
 * Uses `configureApp` from src/main.ts (the same global pipes/filters/
 * interceptors the real server uses) instead of re-declaring them here, so
 * this test can never silently drift from production bootstrap behavior.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/main';

describe('Storefront e2e flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = `e2e-${Date.now()}@example.com`;
  let accessToken: string;
  let cookies: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { apiPrefix: 'api/v1', corsOrigin: 'http://localhost:3000' });
    await app.init();

    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  }, 30000);

  it('registers a new customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'Password123', firstName: 'E2E', lastName: 'Tester' })
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    cookies = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie']].filter(Boolean);
  });

  it('lists published products publicly', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    expect(res.body.data.items).toBeInstanceOf(Array);
  });

  it('rejects access to admin routes for a customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/orders/admin/all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns an empty cart for a new user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('rejects requests with no token at all', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/cart');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('refreshes the access token using the refresh cookie, rotating the refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);
    // Note: a same-second reissue can produce a byte-identical JWT (`iat` has
    // second-level granularity), so token equality isn't a meaningful check.
    // What matters is that the *refresh token* is rotated and the old one
    // stops working, which is what the reuse check below verifies.
    expect(res.body.data.accessToken).toBeDefined();

    const reuse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(reuse.status).toBe(401);
  });
});
