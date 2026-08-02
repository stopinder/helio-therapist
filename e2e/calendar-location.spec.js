import { test, expect } from '@playwright/test';

test.describe('Calendar Location URL Handling', () => {
  const email = 'therapist@example.com';
  const password = 'password123';
  // Use a fixed date to ensure events fall within the visible range
  const baseDate = new Date('2026-08-02T10:00:00Z');

  async function setupMocks(page, eventFixtures) {
    // Freeze date for the browser
    await page.addInitScript((dateStr) => {
      const date = new Date(dateStr);
      const _Date = window.Date;
      window.Date = class extends _Date {
        constructor(...args) {
          if (args.length === 0) return new _Date(date);
          return new _Date(...args);
        }
        static now() {
          return date.getTime();
        }
        static [Symbol.hasInstance](instance) {
          return instance instanceof _Date;
        }
      };
    }, baseDate.toISOString());

    // Mock Auth
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: 'mock-user-id', email: email }
        })
      });
    });

    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: email, last_synced_at: new Date().toISOString() })
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', full_name: 'Robert', role: 'therapist' }])
      });
    });

    await page.route('**/api/google/events*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ events: eventFixtures })
      });
    });
  }

  async function performLogin(page) {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('aside').getByRole('link', { name: /Calendar/i })).toBeVisible({ timeout: 15000 });
    await page.locator('aside').getByRole('link', { name: /Calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);
  }

  test('should format long BetterHelp URL correctly', async ({ page }) => {
    const longUrl = 'https://www.betterhelp.com/session/verify?token=very-long-token-that-would-overflow-the-ui-normally-1234567890-abcdefghijklmnopqrstuvwxyz&user=therapist-123';
    const eventFixtures = [
      {
        id: 'google-url',
        summary: 'BetterHelp Session',
        start: new Date(baseDate.getTime()).toISOString(),
        end: new Date(baseDate.getTime() + 3600000).toISOString(),
        location: longUrl,
        source: 'google'
      }
    ];

    await setupMocks(page, eventFixtures);
    await performLogin(page);
    
    const event = page.locator('text=BetterHelp Session').first();
    await expect(event).toBeVisible();
    await event.click();

    const popover = page.locator('.fixed.z-40');
    await expect(popover).toBeVisible();

    const link = popover.getByRole('link', { name: /Open meeting link/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', longUrl);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    await expect(popover).toContainText('www.betterhelp.com');
    const content = await popover.innerText();
    expect(content).not.toContain('very-long-token-that-would-overflow');
  });

  test('should wrap plain text location correctly', async ({ page }) => {
    const longText = 'Building 4, Floor 3, Room 302, North Wing, Near the elevator, Main Campus, 123 University Ave, Palo Alto, CA 94301';
    const eventFixtures = [
      {
        id: 'google-text',
        summary: 'Office Meeting',
        start: new Date(baseDate.getTime()).toISOString(),
        end: new Date(baseDate.getTime() + 3600000).toISOString(),
        location: longText,
        source: 'google'
      }
    ];

    await setupMocks(page, eventFixtures);
    await performLogin(page);
    
    const event = page.locator('text=Office Meeting').first();
    await expect(event).toBeVisible();
    await event.click();

    const popover = page.locator('.fixed.z-40');
    await expect(popover).toBeVisible();

    const locationSpan = popover.locator('span.break-words');
    await expect(locationSpan).toBeVisible();
    await expect(locationSpan).toHaveText(longText);
    await expect(locationSpan).toHaveClass(/whitespace-pre-wrap/);
  });

  test('should reject unsafe protocols and treat as plain text', async ({ page }) => {
    const xss = 'javascript:alert(1)';
    const eventFixtures = [
      {
        id: 'google-xss',
        summary: 'Unsafe Location',
        start: new Date(baseDate.getTime()).toISOString(),
        end: new Date(baseDate.getTime() + 3600000).toISOString(),
        location: xss,
        source: 'google'
      }
    ];

    await setupMocks(page, eventFixtures);
    await performLogin(page);
    
    const event = page.locator('text=Unsafe Location').first();
    await expect(event).toBeVisible();
    await event.click();

    const popover = page.locator('.fixed.z-40');
    await expect(popover).toBeVisible();

    const link = popover.getByRole('link', { name: /Open meeting link/i });
    await expect(link).not.toBeVisible();
    
    const anchors = await popover.locator('a').all();
    for (const anchor of anchors) {
      const href = await anchor.getAttribute('href');
      expect(href).not.toBe(xss);
    }
    
    await expect(popover).toContainText(xss);
  });
});
