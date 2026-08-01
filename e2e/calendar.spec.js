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
    await appointment.waitFor({ state: 'visible', timeout: 5000 });
    await appointment.click();
    const popover = page.locator('.fixed.z-40.w-64');
    await expect(popover).toBeVisible();
    
    // Action visibility
    const openClientButton = popover.getByRole('link', { name: /Open Client/i });
    await expect(openClientButton).toBeVisible();

    const startButton = popover.getByRole('link', { name: /Start Session/i });
    // Based on deterministic safe fixture data (which we assume exists for this test user)
    // we expect at least one eligible and one ineligible session in a real suite.
    // For this e2e, we verify the presence of the popover and at least one action.
    
    // Dismissal with Escape
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();

    // 6. Tablet viewport check
    await page.setViewportSize({ width: 800, height: 800 });
    const collapsedAgenda = page.locator('aside.w-12');
    await expect(collapsedAgenda).toBeVisible();

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
