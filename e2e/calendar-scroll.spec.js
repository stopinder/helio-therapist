import { test, expect } from '@playwright/test';

test.describe('Calendar Scrolling', () => {
  const email = 'therapist@example.com';
  const password = 'password123';
  const baseDate = new Date('2026-08-05T10:00:00Z'); // Wednesday

  async function setupMocks(page, eventFixtures) {
    await page.addInitScript((dateStr) => {
      const date = new Date(dateStr);
      const _Date = window.Date;
      window.Date = class extends _Date {
        constructor(...args) {
          if (args.length === 0) return new _Date(date);
          return new _Date(...args);
        }
        static now() { return date.getTime(); }
        static [Symbol.hasInstance](instance) { return instance instanceof _Date; }
      };
    }, baseDate.toISOString());

    await page.route('**/auth/v1/token*', async (route) => {
      const request = route.request();
      const postData = request.postData();
      const payload = postData ? JSON.parse(postData) : {};
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXItaWQiLCJlbWFpbCI6Im1vY2tAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.mock-sig',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { 
            id: 'mock-user-id', 
            email: payload.email || email,
            user_metadata: { full_name: 'Robert' }
          }
        })
      });
    });
    await page.route('**/api/google/status*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true, email, last_synced_at: new Date().toISOString() }) });
    });
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'mock-user-id', full_name: 'Robert', role: 'therapist' }]) });
    });
    await page.route('**/api/google/events*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: eventFixtures }) });
    });
  }

  async function performLogin(page) {
    await page.goto('/');
    const emailInput = page.getByLabel('Email address');
    await emailInput.fill(email);
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(password);
    
    const calendarNavLink = page.locator('aside').getByRole('link', { name: /Calendar/i });
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    await expect(calendarNavLink).toBeVisible({ timeout: 15000 });
    await calendarNavLink.click();
    await expect(page).toHaveURL(/\/calendar/);
  }

  test('should be able to reach later appointments by scrolling', async ({ page }) => {
    // Create an event late in the day (20:00)
    const lateEventStart = new Date(baseDate);
    lateEventStart.setUTCHours(20, 0, 0, 0);
    const lateEventEnd = new Date(lateEventStart);
    lateEventEnd.setUTCHours(21, 0, 0, 0);

    const eventFixtures = [
      {
        id: 'late-event',
        summary: 'Late Night Session',
        start: lateEventStart.toISOString(),
        end: lateEventEnd.toISOString(),
        source: 'google',
        status: 'confirmed'
      }
    ];

    await setupMocks(page, eventFixtures);
    await performLogin(page);

    // Grid should be scrollable
    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    // The event at 20:00 should exist but might be out of view initially
    const lateEvent = page.locator('[data-testid="timed-grid-scroll"]').getByText('Late Night Session').first();
    await expect(lateEvent).toBeAttached();

    // Scroll to the bottom
    await scrollContainer.evaluate((el) => el.scrollTop = el.scrollHeight);

    // Now it should be visible
    await expect(lateEvent).toBeVisible();
    
    // Verify it can be clicked
    await lateEvent.click();
    await expect(page.locator('.fixed.z-40')).toBeVisible();
  });

  test('weekday headers should remain sticky while scrolling', async ({ page }) => {
    await setupMocks(page, []);
    await performLogin(page);

    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    
    // Check first day header position
    const dayHeader = page.locator('text=MON').first();
    const initialBox = await dayHeader.boundingBox();
    
    // Scroll down
    await scrollContainer.evaluate((el) => el.scrollTop = 500);
    
    const scrolledBox = await dayHeader.boundingBox();
    
    // Y position should remain roughly the same relative to the viewport (header is 14*4=56px approx)
    // The scrollContainer is below the main header.
    expect(scrolledBox.y).toBeCloseTo(initialBox.y, 1);
  });
});
