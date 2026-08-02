import { test, expect } from '@playwright/test';

test.describe('Calendar Initial Scroll Position', () => {
  const email = 'therapist@example.com';
  const password = 'password123';
  const baseDate = new Date('2026-08-05T10:00:00Z'); // Wednesday

  async function setupMocks(page, eventFixtures = []) {
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
    // Mock clients and sessions to avoid real DB calls
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
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

  test('should initially scroll to 08:00 in Week view', async ({ page }) => {
    await setupMocks(page);
    await performLogin(page);

    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    // Check scrollTop. 8 AM with hourHeight 60px should be 480px.
    // Give it a bit of room for different viewports/rounding.
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThanOrEqual(470);
    expect(scrollTop).toBeLessThanOrEqual(490);
  });

  test('should initially scroll to 08:00 in Day view', async ({ page }) => {
    await setupMocks(page);
    await performLogin(page);

    // Switch to Day view
    await page.getByRole('button', { name: 'day', exact: true }).click();
    
    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThanOrEqual(470);
    expect(scrollTop).toBeLessThanOrEqual(490);
  });

  test('should preserve manual scroll across event refreshes', async ({ page }) => {
    let callCount = 0;
    const events1 = [];
    const events2 = [{
      id: 'refreshed-event',
      summary: 'New Event',
      start: '2026-08-05T14:00:00Z',
      end: '2026-08-05T15:00:00Z',
      source: 'google',
      status: 'confirmed'
    }];

    await setupMocks(page);
    // Override events route to return different data on second call
    await page.route('**/api/google/events*', async (route) => {
      callCount++;
      const events = callCount === 1 ? events1 : events2;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events }) });
    });

    await performLogin(page);

    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    // Manually scroll to 12:00 (12 * 60 = 720)
    await scrollContainer.evaluate((el) => el.scrollTop = 720);
    
    // Trigger refresh manually or wait for auto-refresh if any. 
    // Here we can click a refresh button if it exists or navigate away and back.
    // Actually, refreshEvents() is triggered by move(), goToday(), etc.
    // Let's click "Refresh" button (the retry one or if there's a sync icon)
    const refreshButton = page.locator('button:has-text("Retry"), [aria-label*="sync" i], button:has-text("Refresh")').first();
    // In our UI, there isn't a dedicated "refresh" button unless it fails. 
    // Let's just click "Week" again or something that calls refreshEvents.
    // Or just wait if we expect it to happen.
    
    // Alternative: call refreshEvents via console if we want to be sure
    await page.evaluate(() => {
       // We don't have direct access to refreshEvents, but we can trigger it via a date move
       window.dispatchEvent(new CustomEvent('manual-refresh-trigger')); // hypothetical
    });

    // Let's use "Next week" and "Prev week" to trigger refreshEvents
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('August 2026')).toBeVisible(); // Wait for navigation
    
    // Scroll in the new week
    await scrollContainer.evaluate((el) => el.scrollTop = 900);
    
    // Go back to current week
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    
    // Check if it stayed at 900 or reset to 480
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    // Requirement says: "When switching between Day and Week, preserve a sensible scroll position where practical; 
    // if the timed view is being opened for the first time, start at 08:00."
    // "Ensure navigation between dates and Google event refreshes does not unexpectedly reset the user’s manual scroll position."
    
    // Since I implemented initialScrollPerformed, it should only scroll to 8 AM ONCE.
    expect(scrollTop).not.toBe(480);
    expect(scrollTop).toBeGreaterThan(800);
  });

  test('Month view should not have its own scroll and remain unaffected', async ({ page }) => {
    await setupMocks(page);
    await performLogin(page);

    await page.getByRole('button', { name: 'month', exact: true }).click();
    
    // Month view should NOT have [data-testid="timed-grid-scroll"]
    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).not.toBeVisible();
    
    // Document should not be scrollable (requirement)
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });
    expect(isScrollable).toBe(false);
  });
});
