import { test, expect } from '@playwright/test';

test.describe('Calendar Browser Layout', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should have valid layout and no overflow at supported viewports', async ({ page }) => {
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
          events: [
            {
              id: 'google-1',
              summary: 'Google Event',
              start: new Date().toISOString(),
              end: new Date(Date.now() + 3600000).toISOString(),
              location: 'Google Meet',
              status: 'confirmed'
            }
          ]
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

    // Sign In (Mocked for E2E consistency)
    await page.route('**/auth/v1/token*', async (route) => {
      const request = route.request();
      const postData = request.postData();
      const payload = postData ? JSON.parse(postData) : {};
      
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
            email: payload.email || email,
            user_metadata: { full_name: 'Robert Ormiston' }
          }
        })
      });
    });

    await page.goto('/');

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    
    const calendarNavLink = page.locator('aside').getByRole('link', { name: /Calendar/i });
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    await expect(calendarNavLink).toBeVisible({ timeout: 15000 });
    await calendarNavLink.click();
    await expect(page).toHaveURL(/\/calendar/);

    const agendaPanel = page.getByTestId('calendar-agenda');
    await expect(agendaPanel).toBeVisible({ timeout: 10000 });
    
    // Verify no scrollbars at supported desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const docDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollY: window.scrollY
    }));
    
    expect(docDimensions.scrollWidth, 'Document should not have horizontal overflow').toBeLessThanOrEqual(docDimensions.clientWidth);
    expect(docDimensions.scrollHeight, 'Document should not have vertical overflow').toBeLessThanOrEqual(docDimensions.clientHeight);
    expect(docDimensions.scrollY, 'window.scrollY should be 0').toBe(0);

    // Grid area should not have vertical scrollbar because it's fitted
    const gridArea = page.locator('.flex-1.flex.flex-col.min-h-0.overflow-hidden.relative');
    const overflowY = await gridArea.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(overflowY).toBe('hidden');

    // Tablet viewport check
    await page.setViewportSize({ width: 800, height: 800 });
    const tabletAgenda = page.getByTestId('calendar-agenda');
    // Tablet collapsed agenda is 48px (w-12)
    await expect(tabletAgenda).toHaveCSS('width', '48px');
  });
});
