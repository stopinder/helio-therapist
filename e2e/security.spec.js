import { test, expect } from '@playwright/test';

test.describe('Security Boundaries', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping security tests: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should deny access to non-existent or unauthorized client', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    // 2. Attempt to access a random UUID (unauthorized/non-existent)
    const randomUuid = '00000000-0000-4000-8000-000000000000';
    await page.goto(`/clients/${randomUuid}`);

    // 3. Verify Workspace Error is displayed (RLS will return no rows, frontend getClient will throw)
    const workspaceError = page.getByRole('heading', { name: /Workspace Error/i });
    await expect(workspaceError).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/The client workspace could not be loaded/i)).toBeVisible();
  });

  test('should deny access to non-existent or unauthorized session', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Attempt to access a random session UUID for a random client UUID
    const randomClientUuid = '00000000-0000-4000-8000-000000000001';
    const randomSessionUuid = '00000000-0000-4000-8000-000000000002';
    await page.goto(`/clients/${randomClientUuid}/sessions/${randomSessionUuid}`);

    // 3. Verify Workspace Error
    const workspaceError = page.getByRole('heading', { name: /Workspace Error/i });
    await expect(workspaceError).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/The session workspace could not be loaded/i)).toBeVisible();
  });
});
