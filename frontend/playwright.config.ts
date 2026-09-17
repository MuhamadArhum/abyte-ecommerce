import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests drive the full stack (frontend + backend + MariaDB) and are not
 * run in CI-less/sandboxed environments without Docker. See docs/SETUP.md.
 * Start the stack first: `docker compose up -d`, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
