import { test, expect } from '@playwright/test';

/**
 * Full customer journey: register -> browse -> search -> product detail ->
 * add to cart -> checkout -> view order confirmation.
 *
 * Requires the full stack running (frontend + backend + a seeded MariaDB
 * with at least one published, in-stock product). Run:
 *   docker compose up -d && npm run test:e2e
 */
test.describe('Customer purchase journey', () => {
  const uniqueEmail = `e2e-customer-${Date.now()}@example.com`;
  const password = 'Password123';

  test('register, add a product to cart, and place an order', async ({ page }) => {
    await page.goto('/account/register');
    await page.getByLabel('First name').fill('E2E');
    await page.getByLabel('Last name').fill('Customer');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/products');
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();

    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toBeVisible();
    await page.getByRole('link', { name: 'Proceed to checkout' }).click();

    await expect(page).toHaveURL('/checkout');
    await page.getByLabel('Full name').fill('E2E Customer');
    await page.getByLabel('Phone').fill('5550000000');
    await page.getByLabel('Address line 1').fill('123 Test Street');
    await page.getByLabel('City').fill('Testville');
    await page.getByLabel('State').fill('TS');
    await page.getByLabel('Postal code').fill('12345');
    await page.getByLabel('Country').fill('Testland');
    await page.getByRole('button', { name: 'Add address' }).click();

    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/account\/orders\/\d+/);
    await expect(page.getByText('Thank you! Your order has been placed successfully.')).toBeVisible();
  });
});
