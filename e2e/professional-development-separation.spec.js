import { test, expect } from '@playwright/test';

test.describe('Professional Development separation', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should prove the four experiences are separate and behave correctly', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Go to Professional Development
    await page.getByRole('link', { name: /Professional Development/i }).click();
    await expect(page.getByText('Professional Development')).toBeVisible();

    // 3. Timeline Interaction (Row opens modal)
    const timelineRow = page.getByTestId('pd-timeline-row').first();
    await expect(timelineRow).toBeVisible();
    await timelineRow.click();
    
    // Assert Private Reflection Modal is visible
    const modal = page.getByTestId('private-reflection-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Private Reflection' })).toBeVisible();
    
    // Close modal
    await modal.getByRole('button', { name: 'Close detail view' }).click();
    await expect(modal).not.toBeVisible();

    // 4. Supervision Pack Interaction
    await page.getByRole('button', { name: 'Pack' }).click();
    await expect(page.getByText('Supervision Pack')).toBeVisible();

    // 5. Assert Pack Row does NOT open modal on click
    const packRow = page.getByTestId('supervision-pack-row').first();
    if (await packRow.isVisible()) {
      await packRow.click();
      await expect(modal).not.toBeVisible();

      // 6. Expand preparation
      const expandButton = packRow.getByTestId('supervision-pack-expand');
      await expandButton.click();
      await expect(page.getByTestId('supervision-pack-inline-preparation')).toBeVisible();

      // 7. Open original reflection from pack
      const openOriginalButton = packRow.getByTestId('open-original-reflection');
      await openOriginalButton.click();
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Close detail view' }).click();
      await expect(modal).not.toBeVisible();

      // 8. Create report preview
      const createReportButton = page.getByRole('button', { name: 'Create Supervision Report' });
      await createReportButton.click();
      
      const reportPreview = page.getByTestId('supervision-report-preview');
      await expect(reportPreview).toBeVisible();
      await expect(reportPreview.getByRole('heading', { name: 'Supervision Report Preview' })).toBeVisible();

      // Assert Pack preparation and report preview are different
      await expect(page.getByTestId('supervision-pack-inline-preparation')).not.toBeVisible(); // It's behind the modal

      // Close report preview
      await reportPreview.getByRole('button', { name: 'Cancel' }).click();
      await expect(reportPreview).not.toBeVisible();
    } else {
      console.log('Skipping pack interaction tests because pack is empty.');
    }
    
    // 9. Timeline three-dot menu session navigation
    await page.getByRole('button', { name: 'Timeline' }).click();
    const firstRow = page.getByTestId('pd-timeline-row').first();
    const menuButton = firstRow.getByRole('button', { name: /menu/i }).or(firstRow.locator('button').last()); // Find action menu
    await menuButton.click();
    
    const openSessionOption = page.getByRole('button', { name: 'Open session' });
    if (await openSessionOption.isVisible()) {
      await openSessionOption.click();
      // Should navigate to session workspace
      await expect(page).toHaveURL(/\/clients\/.*\/sessions\//);
    }
  });
});
