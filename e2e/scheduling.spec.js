import { test, expect } from '@playwright/test';

const email = process.env.PLAYWRIGHT_TEST_EMAIL;
const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.describe('Therapist appointment scheduling', () => {
  test.beforeEach(async () => {
    if (!email || !password) {
      test.skip(true, 'PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are required.');
    }
  });

  test('therapist chooses a client before opening Zoom Scheduler', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('workspace-shell')).toBeVisible();

    await page.getByRole('link', { name: 'Schedule appointment', exact: true }).click();
    await expect(page).toHaveURL(/\/schedule$/);
    await expect(page.getByRole('heading', { name: 'Schedule appointment' })).toBeVisible();

    const continueButton = page.getByRole('button', { name: 'Continue to available times' });
    await expect(continueButton).toBeDisabled();

    const clientSelect = page.getByLabel('Client');
    await expect(clientSelect).toBeVisible();
    await expect.poll(async () => clientSelect.locator('option').count()).toBeGreaterThan(1);

    const firstClientValue = await clientSelect.locator('option').nth(1).getAttribute('value');
    expect(firstClientValue).toBeTruthy();
    await clientSelect.selectOption(firstClientValue);
    await expect(continueButton).toBeEnabled();

    await page.route('**/api/zoom/scheduler/create-booking-link', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('POST');
      expect(request.postDataJSON()).toEqual({ clientId: firstClientValue });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          appointmentId: '00000000-0000-4000-8000-000000000001',
          bookingUrl: 'https://scheduler.zoom.us/t/helios-playwright-test'
        })
      });
    });

    await continueButton.click();
    await expect(page.getByText(/Booking link ready for/i)).toBeVisible();
    const bookingLink = page.getByRole('link', { name: /Open booking page/i });
    await expect(bookingLink).toHaveAttribute('href', 'https://scheduler.zoom.us/t/helios-playwright-test');
  });
});
