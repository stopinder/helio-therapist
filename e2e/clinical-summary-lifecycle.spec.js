import { test, expect } from '@playwright/test';

test.describe('Clinical Summary Lifecycle', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should complete clinical summary lifecycle from draft to approval', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Navigate to a session
    await page.getByRole('link', { name: /Clients/i }).click();
    const openClientButton = page.getByTestId('open-client-button').first();
    await expect(openClientButton).toBeVisible();
    await openClientButton.click();

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
    const testValue = 'Lifecycle Test ' + Date.now();
    const textArea = page.getByLabel(/Presenting concerns/i);
    await textArea.fill(testValue);

    // 6. Mark Ready for Review
    await page.getByRole('button', { name: 'Mark Ready for Review' }).click();
    await expect(page.getByText('Review Clinical Summary')).toBeVisible();

    // 7. Approve
    await page.getByLabel(/I have reviewed this summary/i).check();
    await page.getByRole('button', { name: 'Approve Clinical Record' }).click();

    // Verify confirmation dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/I confirm that this summary accurately represents the session/i).check();
    await page.getByRole('button', { name: 'Approve and Create Clinical Record' }).click();

    // 8. Verify Approval Success
    await expect(page.getByText('Approved successfully.')).toBeVisible();
    await expect(page.getByText('This approved record is read-only.')).toBeVisible();
    await expect(page.getByText(testValue)).toBeVisible();

    // 9. Reload and verify persistence of approved state
    await page.reload();
    const clinicalRecordTabReload = page.getByRole('tab', { name: 'Clinical Record' });
    await expect(clinicalRecordTabReload).toBeVisible();
    await clinicalRecordTabReload.click();
    await expect(page.getByText('This approved record is read-only.')).toBeVisible();
    await expect(page.getByText(testValue)).toBeVisible();
    
    // Verify no edit buttons are present
    await expect(page.getByRole('button', { name: 'Save Draft' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark Ready for Review' })).not.toBeVisible();
  });
});
