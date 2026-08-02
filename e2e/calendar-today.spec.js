import { test, expect } from '@playwright/test';

test.describe('Calendar Today Weekend Navigation', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }

    // Mock Google API status
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

    // Mock Google events
    await page.route('**/api/google/events*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: []
        })
      });
    });

    // Mock Helios profile response
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'mock-user-id',
          full_name: 'Robert Ormiston',
          role: 'therapist'
        }])
      });
    });

    // Sign In Mock
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { 
            id: 'mock-user-id', 
            email: email,
            user_metadata: { full_name: 'Robert Ormiston' }
          }
        })
      });
    });

    // Login process
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('aside').getByRole('link', { name: /Calendar/i })).toBeVisible({ timeout: 15000 });
  });

  test('should open in Day view if initial load is a Saturday', async ({ page }) => {
    // Saturday, 2026-08-01
    await page.clock.setFixedTime(new Date('2026-08-01T10:00:00'));

    await page.locator('aside').getByRole('link', { name: /Calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);
    
    // Check if Day view is active
    await expect(page.getByRole('button', { name: 'day', exact: true })).toHaveAttribute('class', /bg-surface-elevated/);
    await expect(page.getByText('1 August 2026')).toBeVisible();
  });

  test('should switch to Day view when pressing Today on a Sunday', async ({ page }) => {
    // Start on a Friday
    await page.clock.setFixedTime(new Date('2026-07-31T10:00:00'));

    await page.locator('aside').getByRole('link', { name: /Calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(page.getByRole('button', { name: 'week', exact: true })).toHaveAttribute('class', /bg-surface-elevated/);

    // Now change system time to Sunday
    await page.clock.setFixedTime(new Date('2026-08-02T10:00:00'));

    await page.getByRole('button', { name: 'Today' }).click();
    
    await expect(page.getByRole('button', { name: 'day', exact: true })).toHaveAttribute('class', /bg-surface-elevated/);
    await expect(page.getByText('2 August 2026')).toBeVisible();
  });
});
