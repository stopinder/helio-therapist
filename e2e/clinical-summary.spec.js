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

    // 3. Switch to Clinical Summary Tab
    await page.getByRole('tab', { name: 'Clinical Summary' }).click();

    // 4. Prepare Draft (if not started)
    const prepareButton = page.getByRole('button', { name: /Prepare Empty Clinical Summary Draft/i });
    if (await prepareButton.isVisible()) {
      await prepareButton.click();
    }

    // Verify Presenting concerns is empty before therapist input
    const textArea = page.getByLabel(/Presenting concerns/i);
    await expect(textArea).toHaveValue('');

    // Verify no [DEMO] text exists anywhere in the clinical-summary workspace
    await expect(page.getByTestId('clinical-summary-workspace')).not.toContainText('[DEMO]');

    // 5. Edit a field
    const testValue = 'Unique therapist-authored value ' + Date.now();
    await textArea.fill(testValue);

    // 6. Save Draft
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();

    // 7. Refresh Page
    await page.reload();

    // 8. Verify Persistence
    await page.getByRole('tab', { name: 'Clinical Summary' }).click();
    await expect(page.getByLabel(/Presenting concerns/i)).toHaveValue(testValue);
  });
});
