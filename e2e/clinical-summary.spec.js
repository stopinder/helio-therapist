import { test, expect } from '@playwright/test';

test.describe('Clinical Summary Persistence', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should persist clinical summary draft', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Navigate to a session
    // We navigate to Clients first
    await page.getByRole('link', { name: /Clients/i }).click();
    const openClientButton = page.getByTestId('open-client-button').first();
    await expect(openClientButton).toBeVisible();
    await openClientButton.click();

    // Open Session Workspace
    const openSessionButton = page.getByRole('button', { name: /Open Session Workspace/i });
    await expect(openSessionButton).toBeVisible();
    await openSessionButton.click();

    // 3. Switch to Clinical Record Tab
    const clinicalRecordTab = page.getByRole('tab', { name: 'Clinical Record' });
    await expect(clinicalRecordTab).toBeVisible();
    await clinicalRecordTab.click();

    // 4. Prepare Draft (if not started)
    const prepareButton = page.getByRole('button', { name: /Prepare Draft Clinical Summary/i });
    if (await prepareButton.isVisible()) {
      await prepareButton.click();
    }

    // 5. Edit a field
    const testValue = 'Test presenting concern ' + Date.now();
    const textArea = page.getByLabel(/Presenting concerns/i);
    await textArea.fill(testValue);

    // 6. Save Draft
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();

    // 7. Refresh Page
    await page.reload();

    // 8. Verify Persistence
    const clinicalRecordTabReload = page.getByRole('tab', { name: 'Clinical Record' });
    await expect(clinicalRecordTabReload).toBeVisible();
    await clinicalRecordTabReload.click();
    await expect(page.getByLabel(/Presenting concerns/i)).toHaveValue(testValue);
  });
});
