import { test, expect } from '@playwright/test';

test.describe('Client Workspace supervision entry', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) test.skip(true, 'Authenticated Playwright credentials are not set.');
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  });

  test('adds a session private reflection from the client workspace', async ({ page }) => {
    await page.getByRole('link', { name: /Clients/i }).click();
    await page.getByTestId('open-client-button').first().click();
    await page.getByRole('button', { name: /Open Session Workspace/i }).click();
    await page.getByRole('tab', { name: 'Notes' }).click();

    const reflectionText = `Client supervision entry ${Date.now()}`;
    await page.getByPlaceholder('Enter private reflections...').fill(reflectionText);
    await page.getByRole('button', { name: 'Save Reflection' }).click();
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: /Clients/i }).click();
    await page.getByTestId('open-client-button').first().click();
    await page.getByRole('button', { name: 'Add to Supervision' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add to Supervision' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(reflectionText)).toBeVisible();
    await expect(dialog).not.toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

    const choice = dialog.locator('label', { hasText: reflectionText });
    await choice.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: /Add 1 to Supervision/ }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole('link', { name: /Professional Development/i }).click();
    await expect(page.getByText(reflectionText)).toBeVisible();
    await page.getByText('Supervision Workspace').click();
    await expect(page.getByText(reflectionText)).toBeVisible();
  });
});
