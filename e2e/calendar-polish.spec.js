import { test, expect } from '@playwright/test';

test.describe('Calendar Polish', () => {
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: 'mock-user-id', email, user_metadata: { full_name: 'Robert' } }
        })
      });
    });
    await page.route('**/api/google/status*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true, email }) });
    });
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'mock-user-id', full_name: 'Robert', role: 'therapist' }]) });
    });
    await page.route('**/api/google/events*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: eventFixtures }) });
    });
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  }

  async function performLogin(page) {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    const calendarNavLink = page.locator('aside').getByRole('link', { name: /Calendar/i });
    await expect(calendarNavLink).toBeVisible({ timeout: 15000 });
    await calendarNavLink.click();
    await expect(page).toHaveURL(/\/calendar/);
  }

  test('should have zero horizontal overflow at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupMocks(page);
    await performLogin(page);

    // Switch to week view (it's default, but let's be sure)
    await page.getByRole('button', { name: 'Week' }).click();
    
    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    const isHorizontalScrollable = await scrollContainer.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    expect(isHorizontalScrollable).toBe(false);
    
    // Check document level overflow
    const isDocHorizontalScrollable = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isDocHorizontalScrollable).toBe(false);
  });

  test('should have zero horizontal overflow at tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupMocks(page);
    await performLogin(page);

    await page.getByRole('button', { name: 'Week' }).click();
    
    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    await expect(scrollContainer).toBeVisible();

    const isHorizontalScrollable = await scrollContainer.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    expect(isHorizontalScrollable).toBe(false);
  });

  test('scrolling content should be clipped beneath sticky header', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Create an event at 00:00 to test clipping
    const midnightEventStart = new Date(baseDate);
    midnightEventStart.setUTCHours(0, 0, 0, 0);
    const midnightEventEnd = new Date(midnightEventStart);
    midnightEventEnd.setUTCHours(1, 0, 0, 0);

    const eventFixtures = [
      {
        id: 'midnight-event',
        summary: 'Midnight Session',
        start: midnightEventStart.toISOString(),
        end: midnightEventEnd.toISOString(),
        source: 'google',
        status: 'confirmed'
      }
    ];

    await setupMocks(page, eventFixtures);
    await performLogin(page);

    await page.getByRole('button', { name: 'Week' }).click();
    
    const midnightEvent = page.getByText('Midnight Session').first();
    await expect(midnightEvent).toBeVisible();

    const scrollContainer = page.locator('[data-testid="timed-grid-scroll"]');
    const dayHeader = page.locator('.sticky.top-0').first();

    // Scroll enough so the event at 00:00 (Y=0 in grid) is partially covered by the header.
    // The header is at the top of the scroll container.
    // If the scroll container is at Y=488, and header is 40px high, it occupies 488-528.
    // The grid starts at Y=488 + 40 = 528 (because of the header spacer or just the sticky header).
    // If we scroll down 20px, the grid Y=0 moves to 528-20 = 508.
    // The header is still at 488-528.
    // So the event at grid Y=0 starts at 508, which is < 528.
    
    await scrollContainer.evaluate((el) => {
        el.scrollTop = 500; // Scroll past the morning
    });
    
    // Actually, I want to scroll so an event at a known time is under the header.
    // If we scroll to 10:00 (10 * 60px = 600px), an event at 09:30 (9.5 * 60 = 570px) should be under the header.
    
    await scrollContainer.evaluate((el) => {
        el.scrollTop = 600;
    });

    const intersectionData = await page.evaluate(() => {
      // Create a test event at 09:30
      // We already have one at 00:00. Let's use it.
      // If we scroll to 08:00 (8 * 60 = 480px), the 00:00 event is at 0 - 480 = -480px relative to grid start.
      // That's way off.
      
      // Let's find an event that IS visible and scroll it under the header.
      const eventEl = Array.from(document.querySelectorAll('[data-testid="timed-grid-scroll"] .absolute')).find(el => el.textContent.includes('Midnight Session'));
      const headerEl = document.querySelector('.sticky.top-0');
      const scrollEl = document.querySelector('[data-testid="timed-grid-scroll"]');
      
      if (!eventEl || !headerEl || !scrollEl) return { found: false };

      const eventRect = eventEl.getBoundingClientRect();
      // Scroll so eventTop is 10px above headerBottom
      const headerRect = headerEl.getBoundingClientRect();
      const targetScrollTop = scrollEl.scrollTop + (eventRect.top - headerRect.bottom) + 10;
      scrollEl.scrollTop = targetScrollTop;
      
      const newEventRect = eventEl.getBoundingClientRect();
      const newHeaderRect = headerEl.getBoundingClientRect();
      
      return {
        found: true,
        eventTop: newEventRect.top,
        eventBottom: newEventRect.bottom,
        headerTop: newHeaderRect.top,
        headerBottom: newHeaderRect.bottom,
        intersecting: (
          newEventRect.top < newHeaderRect.bottom &&
          newEventRect.bottom > newHeaderRect.top
        )
      };
    });

    if (!intersectionData.found) {
        throw new Error(`Could not find event or header element. hasEvent: ${intersectionData.hasEvent}, hasHeader: ${intersectionData.hasHeader}`);
    }

    console.log('Intersection Data:', intersectionData);
    // expect(intersectionData.intersecting).toBe(true); // Yes, it intersects

    // Now check if it's "above" the header. It should NOT be.
    // We can check z-index or use elementFromPoint
    const elementAtEventPoint = await page.evaluate(() => {
        const headerEl = document.querySelector('.sticky.top-0');
        if (!headerEl) return null;
        const rect = headerEl.getBoundingClientRect();
        // Pick a point in the middle of the header
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // We need an event to be AT that point.
        // Let's scroll the event at 00:00 to be behind the header.
        const eventEl = Array.from(document.querySelectorAll('[data-testid="timed-grid-scroll"] .absolute')).find(el => el.textContent.includes('Midnight Session'));
        const scrollEl = document.querySelector('[data-testid="timed-grid-scroll"]');
        if (!eventEl || !scrollEl) return "no event or scroll el";
        
        const eventRect = eventEl.getBoundingClientRect();
        const headerRect = headerEl.getBoundingClientRect();
        
        // Scroll so event center is at header center
        const currentEventCenterY = eventRect.top + eventRect.height / 2;
        const targetHeaderCenterY = headerRect.top + headerRect.height / 2;
        scrollEl.scrollTop = scrollEl.scrollTop + (currentEventCenterY - targetHeaderCenterY);
        
        const el = document.elementFromPoint(x, y);
        return el ? el.textContent : null;
    });

    console.log('Element at point:', elementAtEventPoint);
    // The element at that point should be the header content (e.g., "MON"), not the event content
    expect(elementAtEventPoint).not.toContain('Midnight Session');
  });
});
