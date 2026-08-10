import { test, expect } from '@playwright/test';

test.describe('Authenticated Therapist Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  async function signInAndOpenFirstClient(page) {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    await page.getByRole('link', { name: /Clients/i }).click();
    const openClientButtons = page.getByTestId('open-client-button');
    await expect(openClientButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await openClientButtons.count()).toBeGreaterThan(0);
    await openClientButtons.first().click();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  }

  test('should navigate from Clients to Session Workspace', async ({ page }) => {
    await signInAndOpenFirstClient(page);

    const openSessionButton = page.getByRole('button', { name: /Open Session Workspace/i });
    await expect(openSessionButton).toBeVisible();
    await openSessionButton.click();

    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(page.url()).not.toContain('s123');

    const workspaceError = page.getByRole('heading', { name: /Workspace Error/i });
    await expect(workspaceError).not.toBeVisible();
    const transcriptTab = page.getByRole('button', { name: /^Transcript$/i });
    await expect(transcriptTab).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    await expect(transcriptTab).toBeVisible();
    await expect(workspaceError).not.toBeVisible();
  });

  test('shows safe feedback and remains retryable when session entry fails', async ({ page }) => {
    await signInAndOpenFirstClient(page);
    const clientWorkspaceUrl = page.url();

    await page.route('**/rest/v1/sessions**', async route => {
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.abort('failed');
    });

    const openSessionButton = page.getByTestId('open-session-workspace');
    await openSessionButton.click();

    await expect(openSessionButton).toBeDisabled();
    await expect(openSessionButton).toContainText('Opening session…');

    const alert = page.getByRole('alert');
    await expect(alert).toHaveText('Couldn’t open the session workspace. Please try again.');
    await expect(page).toHaveURL(clientWorkspaceUrl);
    await expect(openSessionButton).toBeEnabled();
    await expect(openSessionButton).toHaveText('Open Session Workspace');

    await openSessionButton.click();
    await expect(alert).toHaveText('Couldn’t open the session workspace. Please try again.');
    await expect(page).toHaveURL(clientWorkspaceUrl);
    await expect(openSessionButton).toBeEnabled();
  });
});
