import { test, expect } from '@playwright/test';

test.describe('Client Creation', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should create a new client and verify it appears in the list', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    // 2. Open Clients page
    await page.getByRole('link', { name: /Clients/i }).click();
    await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
    await expect(page.getByTestId('client-search')).toBeVisible();

    // 3. Click Add Client. The visible label stays stable even though the control now uses an SVG icon.
    await page.getByRole('button', { name: 'Add Client', exact: true }).click();

    // 4. Verify modal is open
    await expect(page.getByRole('heading', { name: 'Add Client' })).toBeVisible();

    // 5. Enter client name
    const clientName = `Test Client ${Date.now()}`;
    await page.getByPlaceholder('Client name').fill(clientName);
    await page.getByPlaceholder('Email (optional)').fill('test@example.com');
    await page.getByPlaceholder('Quick note (optional)').fill('This is a test client.');

    // 6. Submit
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // 7. Verify modal closes and client appears in the directory
    await expect(page.getByRole('heading', { name: 'Add Client' })).not.toBeVisible();
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10000 });

    // 8. Reload the page
    await page.reload();

    // 9. Verify the client still appears
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10000 });
  });
});
