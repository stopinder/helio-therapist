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

    // 5. Click Save and Wait for confirmation
    const saveButton = page.getByRole('button', { name: 'Save Reflection' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
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

    // 8. Go to Professional Development and verify it IS there
    await page.getByRole('link', { name: /Professional Development/i }).click();
    await expect(page.getByText('Professional Development')).toBeVisible();
    await expect(page.getByText(testReflection)).toBeVisible();

    // 9. Verify Action Menu and Supervision Selection
    const reflectionCard = page.locator('div', { hasText: testReflection }).first();
    const actionMenuButton = reflectionCard.getByRole('button', { name: 'Reflection actions' });
    await expect(actionMenuButton).toBeVisible();
    await actionMenuButton.click();

    // Check action menu items
    await expect(page.getByText('Reflect with AI')).toBeVisible();
    await expect(page.getByText('Add to CPD')).toBeVisible();
    await expect(page.getByText('Include in Supervision Pack')).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();

    // Toggle Supervision Selection
    await page.getByText('Include in Supervision Pack').click();
    await expect(reflectionCard.getByText('Supervision Pack')).toBeVisible();

    // Remove from Supervision Pack
    await actionMenuButton.click();
    await expect(page.getByText('Remove from Supervision Pack')).toBeVisible();
    await page.getByText('Remove from Supervision Pack').click();
    await expect(reflectionCard.getByText('Supervision Pack')).not.toBeVisible();

    // 10. Verify Search and Theme Filters
    const searchInput = page.getByPlaceholder('Search reflections...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('nonexistent-text-xyz');
    await expect(page.getByText('No reflections match this filter.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText(testReflection)).toBeVisible();

    const allThemeButton = page.getByRole('button', { name: /^All \d+$/ });
    await expect(allThemeButton).toBeVisible();
    await expect(allThemeButton).toHaveAttribute('aria-pressed', 'true');

    // 11. Verify navigation from reflection card back to session
    // We'll click the text snippet to navigate
    await page.getByText(testReflection).click();
    await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter private reflections...')).toHaveValue(testReflection);
  });
});
