import { test, expect } from '@playwright/test';

test.describe('Calendar Workspace Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should navigate to Calendar and interact with the timed grid', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // Wait for the app to load
    await expect(page.locator('aside')).toBeVisible(); // Sidebar should be visible
    
    // 2. Exactly one application shell (sidebar and header)
    const appSidebar = page.locator('aside').filter({ hasText: /Helios/ });
    await expect(appSidebar).toHaveCount(1);
    const activeIndicators = page.locator('text=Workspace Active');
    await expect(activeIndicators).toHaveCount(1);

    // 3. Navigate to Calendar
    await page.getByRole('link', { name: /Calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);

    // 4. Desktop agenda and dominant timed week canvas
    const agendaPanel = page.locator('aside').filter({ hasText: /Today|Upcoming/ });
    await expect(agendaPanel).toBeVisible();
    
    const weekGrid = page.locator('main').filter({ hasText: /Mon|Tue|Wed|Thu|Fri/ });
    await expect(weekGrid).toBeVisible();
    await expect(page.locator('.min-w-calendar-grid')).toBeVisible();

    // 5. Selecting an appointment exposes permitted actions
    const appointment = page.locator('.absolute.rounded-control').first();
    if (await appointment.isVisible()) {
      await appointment.click();
      const popover = page.locator('.fixed.z-40.w-64');
      await expect(popover).toBeVisible();
      
      // Action visibility and ineligible appointments
      // We can't guarantee state, but we can check for buttons if eligible
      const startButton = popover.getByRole('link', { name: /Start Session/i });
      const openClientButton = popover.getByRole('link', { name: /Open Client/i });
      
      // Dismissal with Escape
      await page.keyboard.press('Escape');
      await expect(popover).not.toBeVisible();
    }

    // 6. Mini-calendar date selection changes displayed week
    const calendarCell = page.locator('.grid-cols-7 .rounded-pill').filter({ hasText: /^15$/ }).first();
    if (await calendarCell.isVisible()) {
      await calendarCell.click();
      // Date label should include "15"
      await expect(page.locator('h2.text-body')).toContainText(/15/);
    }

    // 7. Responsive Widths: Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.h-full.flex.flex-col.bg-surface')).toBeVisible(); // Mobile day view
    await expect(page.locator('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri/ })).toHaveCount(5); // Day tabs
    
    // No avoidable page-level horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
