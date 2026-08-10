import { test, expect } from '@playwright/test';

test.describe('Client Workspace live overview', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async () => {
    if (!email || !password) test.skip(true, 'Skipping authenticated test: credentials are not set.');
  });

  test('new client shows live context without fabricated clinical content', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('link', { name: /Clients/i }).click();

    await page.getByRole('button', { name: '+ Add Client' }).click();
    const clientName = `Live Overview ${Date.now()}`;
    await page.getByPlaceholder('Client name').fill(clientName);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const row = page.locator('tr').filter({ hasText: clientName });
    await row.getByTestId('open-client-button').click();

    await expect(page.getByRole('heading', { name: clientName })).toBeVisible();
    await expect(page.getByText('No sessions recorded for this client yet.')).toBeVisible();
    await expect(page.getByText('No structured goals are recorded for this client yet.')).toBeVisible();
    await expect(page.getByText('No structured tasks are recorded for this client yet.')).toBeVisible();
    await expect(page.getByText('No clinical attention items are recorded for this client.')).toBeVisible();
    await expect(page.getByText('No upcoming appointment is recorded.')).toBeVisible();
    await expect(page.getByText(/Alex Rivera|Values exploration|PHQ-9 Improving|Review PHQ-9 trends/)).toHaveCount(0);
  });
});
