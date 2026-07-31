import { test, expect } from '@playwright/test';

test.describe('Review Reflections Redesign', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should verify expanding reflections and focus mode', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Go to Professional Development -> Review Reflections
    await page.getByRole('link', { name: /Professional Development/i }).click();
    await page.getByRole('link', { name: 'Review Reflections' }).click();
    
    // 3. Verify Timeline structure
    const timelineRows = page.getByTestId('pd-timeline-row');
    const firstRow = timelineRows.first();
    await expect(firstRow).toBeVisible();

    // 4. Expand first reflection
    // Click on the row header to expand
    await firstRow.locator('div').filter({ hasText: /Reflection/ }).first().click();
    
    // 5. Verify Focus Mode (opacity of other rows)
    const secondRow = timelineRows.nth(1);
    if (await secondRow.isVisible()) {
      await expect(secondRow).toHaveClass(/opacity-35/);
    }
    
    // 6. Verify expanded content
    await expect(firstRow.getByText('Date')).toBeVisible();
    await expect(firstRow.getByText('Collapse')).toBeVisible();
    
    // 7. Collapse reflection
    await firstRow.getByRole('button', { name: 'Collapse' }).click();
    
    // 8. Verify Focus Mode is cleared
    if (await secondRow.isVisible()) {
      await expect(secondRow).not.toHaveClass(/opacity-35/);
    }
  });

  test('should verify empty state message', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // 2. Go to Professional Development -> Review Reflections
    await page.getByRole('link', { name: /Professional Development/i }).click();
    await page.getByRole('link', { name: 'Review Reflections' }).click();

    // 3. Apply a search that results in no matches
    await page.getByPlaceholder('Search reflections...').fill('NON_EXISTENT_REFLECTION_XYZ');
    
    // 4. Verify empty search results state
    await expect(page.getByText('No reflections found for this search.')).toBeVisible();
    await page.getByRole('button', { name: 'View all reflections' }).click();
    
    // 5. Check if search cleared
    await expect(page.getByPlaceholder('Search reflections...')).toHaveValue('');
  });
});
