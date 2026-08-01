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
    const agendaPanel = page.getByTestId('calendar-agenda');
    await expect(agendaPanel).toBeVisible();
    
    const weekGrid = page.getByTestId('calendar-canvas');
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
    // Tablet collapsed agenda should be 48px
    const tabletAgenda = page.getByTestId('calendar-agenda');
    await expect(tabletAgenda).toHaveCSS('width', '48px');
    
    // Ensure no horizontal overflow at tablet width
    const tabletScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const tabletClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(tabletScrollWidth).toBeLessThanOrEqual(tabletClientWidth);

    // 7. Verify single vertical scrolling region and fixed elements
    // Helper to find visible scrollable elements
    const getScrollableElements = async () => {
      return await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => {
            const style = window.getComputedStyle(el);
            const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
            const hasOverflow = ['auto', 'scroll'].includes(style.overflowY);
            const isScrollable = el.scrollHeight > el.clientHeight;
            return isVisible && hasOverflow && isScrollable;
          })
          .map(el => ({
            tag: el.tagName,
            id: el.id,
            testId: el.getAttribute('data-testid'),
            className: el.className,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          }));
      });
    };

    // Body and HTML should not scroll
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

    const mainElement = page.locator('main.flex-1.bg-surface-canvas');
    const mainOverflow = await mainElement.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(mainOverflow).toBe('hidden');

    // Grid container should be the vertical scroll owner
    const gridContainer = page.getByTestId('timed-grid-scroll');
    await expect(gridContainer).toHaveCSS('overflow-y', 'auto');
    
    const isGridScrollable = await gridContainer.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(isGridScrollable, 'Timed grid should be scrollable').toBeTruthy();

    // Changing timedGrid.scrollTop does not change window.scrollY
    const initialScrollTop = await gridContainer.evaluate((el) => el.scrollTop);
    await gridContainer.evaluate((el) => el.scrollTop = 100);
    const newScrollTop = await gridContainer.evaluate((el) => el.scrollTop);
    expect(newScrollTop, 'Grid scrollTop should change').not.toBe(initialScrollTop);
    
    const pageScrollYAfter = await page.evaluate(() => window.scrollY);
    expect(pageScrollYAfter, 'Scrolling grid should not scroll page').toBe(0);

    // Verify exactly one scrollable element in the calendar workspace (the timed grid)
    const scrollableElements = await getScrollableElements();
    const scrollableTestIds = scrollableElements.map(el => el.testId || el.className);
    
    expect(scrollableElements.length, `Expected only one scrollable element, found: ${JSON.stringify(scrollableElements)}`).toBe(1);
    expect(scrollableElements[0].testId).toBe('timed-grid-scroll');

    // 8. Mini-calendar date selection changes displayed week
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
