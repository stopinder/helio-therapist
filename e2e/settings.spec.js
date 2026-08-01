import { test, expect } from '@playwright/test';

test.describe('Settings Workspace Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should render settings and launch Google OAuth flow', async ({ page }) => {
    // Mock profiles
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', role: 'therapist' }])
      });
    });

    // Mock Google status
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: true,
          email: 'therapist@example.com',
          last_synced_at: new Date().toISOString()
        })
      });
    });

    // Mock Zoom status
    await page.route('**/api/zoom/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false })
      });
    });

    // Mock Sign In
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { 
            id: 'mock-user-id', 
            email,
            aud: 'authenticated',
            role: 'authenticated'
          }
        })
      });
    });

    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // Wait for AppShell
    const settingsLink = page.locator('aside').getByRole('link', { name: /Settings/i });
    await expect(settingsLink).toBeVisible({ timeout: 15000 });
    await settingsLink.click();

    await expect(page).toHaveURL(/\/settings/);
    
    // Check for Google Calendar connection info
    await expect(page.getByText('Google Calendar', { exact: true })).toBeVisible();
    await expect(page.getByText('✓ Connected')).toBeVisible();
    await expect(page.getByText('therapist@example.com')).toBeVisible();

    // Check for Zoom connection info
    await expect(page.locator('div').filter({ hasText: /^Zoom$/ })).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^Not connected$/ }).first()).toBeVisible();

    // Mock Google Authorize
    await page.route('**/api/google/authorize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1' })
      });
    });

    // Disconnect Google and reconnect
    await page.locator('details summary').first().click();
    
    // Mock disconnect
    await page.route('**/api/google/disconnect', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
    
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Disconnect Google Calendar' }).click();
    
    // Mock Google status as disconnected
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false })
      });
    });
    
    // Wait for UI to update (the component might not poll, so we might need to trigger a re-fetch or just expect it to change if the component handles it)
    // Actually Settings.vue updates googleStatus.value = 'Not connected' on success.
    
    // Now should show "Connect"
    const connectButton = page.getByRole('button', { name: 'Connect', exact: true }).first();
    await expect(connectButton).toBeVisible();
    
    // Clicking connect should redirect
    await connectButton.click();
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test('should handle reconnect required state', async ({ page }) => {
    // Mock Google status with error
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: true,
          email: 'therapist@example.com',
          error: 'GOOGLE_TOKEN_EXPIRED'
        })
      });
    });
    
    // Mock Zoom status
    await page.route('**/api/zoom/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false })
      });
    });

    // Mock Sign In
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { 
            id: 'mock-user-id', 
            email,
            aud: 'authenticated',
            role: 'authenticated'
          }
        })
      });
    });

    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    const settingsLink = page.locator('aside').getByRole('link', { name: /Settings/i });
    await expect(settingsLink).toBeVisible({ timeout: 15000 });
    await settingsLink.click();

    await expect(page.getByText('⚠ Reconnect Required')).toBeVisible();
    const reconnectButton = page.getByRole('button', { name: 'Reconnect' });
    await expect(reconnectButton).toBeVisible();
    
    // Mock Google Authorize
    await page.route('**/api/google/authorize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=reconnect' })
      });
    });
    
    await reconnectButton.click();
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
