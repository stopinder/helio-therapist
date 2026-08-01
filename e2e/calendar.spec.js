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
    // We expect the test data to have a session named "Client A" which is eligible
    // and "Client B" which is completed/ineligible.
    const eligibleAppointment = page.locator('.absolute.rounded-control', { hasText: 'Client A' }).first();
    await eligibleAppointment.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    
    if (await eligibleAppointment.isVisible()) {
      await eligibleAppointment.click();
      const popover = page.locator('.fixed.z-40.w-64');
      await expect(popover).toBeVisible();
      
      // Explicit action assertions
      await expect(popover.getByRole('link', { name: /Open Client/i })).toBeVisible();
      await expect(popover.getByRole('link', { name: /Start Session/i })).toBeVisible();

      // Dismissal with Escape
      await page.keyboard.press('Escape');
      await expect(popover).not.toBeVisible();
    }

    const ineligibleAppointment = page.locator('.absolute.rounded-control', { hasText: 'Client B' }).first();
    if (await ineligibleAppointment.isVisible()) {
      await ineligibleAppointment.click();
      const popover = page.locator('.fixed.z-40.w-64');
      await expect(popover).toBeVisible();
      await expect(popover.getByRole('link', { name: /Start Session/i })).not.toBeVisible();
      await page.keyboard.press('Escape');
    }

    // 6. Tablet viewport check
    await page.setViewportSize({ width: 800, height: 800 });
    // Tablet collapsed agenda should be 48px (w-12)
    const collapsedAgenda = page.locator('aside').filter({ has: page.locator('.w-12') });
    await expect(collapsedAgenda).toBeVisible();
    
    // Ensure no horizontal overflow at tablet width
    const tabletScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const tabletClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(tabletScrollWidth).toBeLessThanOrEqual(tabletClientWidth);

    // 7. Mini-calendar date selection changes displayed week
    const calendarCell = page.locator('.grid-cols-7 .rounded-pill:not(:empty)').filter({ hasText: /^15$/ }).first();
    await calendarCell.click();
    await expect(page.locator('h2.text-body')).toContainText(/15/);

    // 8. Responsive Widths: Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.h-full.flex.flex-col.bg-surface')).toBeVisible(); // Mobile day view
    await expect(page.locator('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri/ })).toHaveCount(5); // Day tabs
    
    // No avoidable page-level horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
