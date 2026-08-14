import { test, expect } from '@playwright/test';

test.describe('Authenticated Therapist Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should navigate from Clients to Session Workspace', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    
    // Fill credentials using accessible labels
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    
    // Click the submit button specifically within the form
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // Wait for the app to load (AppShell/router-view)
    // We expect to land on Overview or whatever the default is
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    // 2. Open Clients
    // Search for the Clients link in the LeftSidebar
    const clientsLink = page.getByRole('link', { name: /Clients/i });
    await clientsLink.click();

    // Verify at least one real client row appears
    // We look for the "Open client" buttons we tagged with data-testid
    const openClientButtons = page.getByTestId('open-client-button');
    await expect(openClientButtons.first()).toBeVisible({ timeout: 10000 });
    
    const clientCount = await openClientButtons.count();
    expect(clientCount).toBeGreaterThan(0);

    // 3. Open the first client
    const firstClientButton = openClientButtons.first();
    await firstClientButton.click();

    // Verify the URL contains /clients/<uuid>
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // 4. Click Clinical Workspace
    const openSessionButton = page.getByRole('button', { name: /Clinical Workspace/i });
    await expect(openSessionButton).toBeVisible();
    await openSessionButton.click();

    // 5. Verify the URL contains /clients/<uuid>/sessions/<uuid>
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Verify s123 is not present
    expect(page.url()).not.toContain('s123');

    // 6. Verify no Workspace Error is displayed
    const workspaceError = page.getByRole('heading', { name: /Workspace Error/i });
    await expect(workspaceError).not.toBeVisible();
    
    // Verify the session workspace loaded (e.g. check for "Transcript" tab)
    const transcriptTab = page.getByRole('button', { name: /^Transcript$/i });
    await expect(transcriptTab).toBeVisible();

    // 7. Refresh the page
    await page.reload();

    // 8. Verify the Session Workspace still loads
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    await expect(transcriptTab).toBeVisible();
    await expect(workspaceError).not.toBeVisible();
  });
});
