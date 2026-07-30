import { test, expect } from '@playwright/test';

test.describe('Private Reflection Persistence', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should persist private reflection and not show it in timeline', async ({ page }) => {
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

    // 3. Switch to Notes Tab
    await page.getByRole('tab', { name: 'Notes' }).click();

    // 4. Fill Private Reflection
    const testReflection = 'Private reflection test ' + Date.now();
    const privateNotesArea = page.getByPlaceholder('Enter private reflections...');
    await privateNotesArea.fill(testReflection);

    // 5. Wait for autosave
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 10000 });

    // 6. Reload and verify persistence
    await page.reload();
    await page.getByRole('tab', { name: 'Notes' }).click();
    await expect(page.getByPlaceholder('Enter private reflections...')).toHaveValue(testReflection);

    // 7. Go to Client Timeline and ensure it's NOT there
    await page.getByRole('link', { name: /Clients/i }).click();
    await openClientButton.click();
    
    // Check timeline items
    const timeline = page.locator('.timeline-container'); // Assuming there's a container or just search by text
    await expect(page.getByText(testReflection)).not.toBeVisible();

    // 8. Go to Supervision and verify it IS there
    await page.getByRole('link', { name: /Supervision/i }).click();
    await expect(page.getByText('Supervision & Reflections')).toBeVisible();
    await expect(page.getByText(testReflection)).toBeVisible();

    // 9. Verify navigation from Supervision back to session
    await page.getByText(testReflection).click();
    await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter private reflections...')).toHaveValue(testReflection);
  });
});
