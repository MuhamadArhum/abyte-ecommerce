import { test, expect } from '@playwright/test';

/**
 * Admin management journey: login -> dashboard -> create category -> create
 * product -> confirm it is manageable from the inventory screen.
 *
 * Requires the full stack running with the seeded super admin account
 * (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, defaults to admin@abyte.local /
 * ChangeMe123!). Run: docker compose up -d && npm run test:e2e
 */
test.describe('Admin management journey', () => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@abyte.local';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'ChangeMe123!';
  const categoryName = `E2E Category ${Date.now()}`;
  const productName = `E2E Product ${Date.now()}`;

  test('logs in as admin and creates a category and product', async ({ page }) => {
    await page.goto('/account/login');
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.goto('/admin/categories');
    await page.getByLabel('Name').fill(categoryName);
    await page.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByText(categoryName)).toBeVisible();

    await page.goto('/admin/products/new');
    await page.getByLabel('Name').fill(productName);
    await page.getByLabel('SKU').fill(`E2E-${Date.now()}`);
    await page.getByLabel('Price').fill('29.99');
    await page.getByLabel('Initial stock').fill('25');
    await page.getByLabel('Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page).toHaveURL('/admin/products');
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto('/admin/inventory');
    await expect(page.getByText(productName)).toBeVisible();
  });
});
