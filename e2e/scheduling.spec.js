import { test, expect } from '@playwright/test';

const therapistId = '11111111-1111-4111-8111-111111111111';
const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fakeEmail = 'playwright@helios.test';
const fakePassword = 'playwright-test-password';

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

const now = Math.floor(Date.now() / 1000);
const fakeAccessToken = [
  base64Url({ alg: 'HS256', typ: 'JWT' }),
  base64Url({
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    sub: therapistId,
    email: fakeEmail,
    role: 'authenticated'
  }),
  'playwright-signature'
].join('.');

const fakeUser = {
  id: therapistId,
  aud: 'authenticated',
  role: 'authenticated',
  email: fakeEmail,
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Playwright Therapist' },
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

const fakeSession = {
  access_token: fakeAccessToken,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: now + 3600,
  refresh_token: 'playwright-refresh-token',
  user: fakeUser
};

test.describe('Therapist appointment scheduling', () => {
  test('therapist chooses a client before opening Zoom Scheduler', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession)
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeUser)
      });
    });

    await page.route('**/rest/v1/clients**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': '0-0/1' },
        body: JSON.stringify([{
          id: clientId,
          user_id: therapistId,
          display_name: 'Playwright Test Client',
          reference: 'TEST-CLIENT',
          current_focus: '',
          archived: false,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }])
      });
    });

    await page.route('**/api/zoom/scheduler/create-booking-link', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('POST');
      expect(request.postDataJSON()).toEqual({ clientId });
      
      const count = await page.evaluate(() => {
        window.__booking_call_count = (window.__booking_call_count || 0) + 1;
        return window.__booking_call_count;
      });

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          appointmentId: `00000000-0000-4000-8000-00000000000${count}`,
          bookingUrl: count === 1 
            ? 'https://scheduler.zoom.us/t/helios-playwright-test'
            : 'https://scheduler.zoom.us/t/helios-playwright-test-2'
        })
      });
    });

    await page.goto('/');
    await page.getByLabel('Email address').fill(fakeEmail);
    await page.getByLabel('Password').fill(fakePassword);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: 'Schedule appointment', exact: true }).click();
    await expect(page).toHaveURL(/\/schedule$/);
    await expect(page.getByRole('heading', { name: 'Schedule appointment' })).toBeVisible();

    const continueButton = page.getByRole('button', { name: 'Continue to available times' });
    await expect(continueButton).toBeDisabled();

    const clientSelect = page.getByLabel('Client');
    await expect(clientSelect).toBeVisible();
    await expect(clientSelect.locator('option')).toHaveCount(2);
    await clientSelect.selectOption(clientId);
    await expect(continueButton).toBeEnabled();

    await continueButton.click();
    await expect(page.getByText('Booking link ready for Playwright Test Client')).toBeVisible();
    await expect(page.getByRole('link', { name: /Open booking page/i })).toHaveAttribute(
      'href',
      'https://scheduler.zoom.us/t/helios-playwright-test'
    );

    // Test "Schedule another" functionality
    const scheduleAnotherButton = page.getByRole('button', { name: 'Schedule another' });
    await expect(scheduleAnotherButton).toBeVisible();
    
    await scheduleAnotherButton.click();
    
    // Wait for the UI to update with the new link from the second call
    await expect(page.getByRole('link', { name: /Open booking page/i })).toHaveAttribute(
      'href',
      'https://scheduler.zoom.us/t/helios-playwright-test-2'
    );
  });
});
