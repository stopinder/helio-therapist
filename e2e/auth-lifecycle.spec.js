import { test, expect } from '@playwright/test';

test.describe('Authentication Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase Auth
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: { id: 'user-123', email: 'therapist@example.com' }
        })
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-123', email: 'therapist@example.com' })
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'user-123', role: 'therapist', full_name: 'Robert Ormiston' }])
      });
    });

    // Mock initial data loads
    await page.route('**/rest/v1/clients*', async (route) => route.fulfill({ status: 200, body: '[]' }));
    await page.route('**/rest/v1/sessions*', async (route) => route.fulfill({ status: 200, body: '[]' }));
    await page.route('**/api/google/status', async (route) => route.fulfill({ status: 200, body: JSON.stringify({ connected: false }) }));

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Perform login
    await page.fill('input[type="email"]', 'therapist@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for workspace to render
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
  });

  test('desktop sign-out', async ({ page }) => {
    // Mock sign-out
    await page.route('**/auth/v1/logout*', async (route) => {
      await route.fulfill({ status: 204 });
    });

    const sidebar = page.locator('aside.hidden.md\\:flex');
    const signOutBtn = sidebar.getByRole('button', { name: /sign out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should return to login page
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('mobile sign-out', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Mock sign-out
    await page.route('**/auth/v1/logout*', async (route) => {
      await route.fulfill({ status: 204 });
    });

    // Open mobile menu
    await page.click('button[aria-label="Open menu"]');
    
    const drawer = page.locator('aside.fixed.inset-y-0');
    const signOutBtn = drawer.getByRole('button', { name: /sign out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // Should return to login page
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('session expiry UI transition', async ({ page }) => {
    // Manually trigger the event that the app listens for
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('helios-session-expired', { 
        detail: { message: 'Your session has expired. Please sign in again.' } 
      }));
    });

    // Should show expiry message on login page
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Your session has expired. Please sign in again.')).toBeVisible();
  });
})
