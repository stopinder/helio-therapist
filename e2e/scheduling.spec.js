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
  base64Url({ aud: 'authenticated', exp: now + 3600, iat: now, sub: therapistId, email: fakeEmail, role: 'authenticated' }),
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

async function mockAuthenticatedTherapist(page) {
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) }));
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) }));
  await page.route('**/rest/v1/clients**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-0/1' },
    body: JSON.stringify([{ id: clientId, user_id: therapistId, display_name: 'Playwright Test Client', reference: 'TEST-CLIENT', current_focus: '', archived: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }])
  }));
}

test.describe('Therapist appointment scheduling', () => {
  test('therapist creates a Helios booking link for a client', async ({ page }) => {
    await mockAuthenticatedTherapist(page);
    const hostedUrl = 'http://127.0.0.1:4173/book/secure-playwright-token';

    await page.route('**/api/zoom/scheduler/create-booking-link', async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ clientId });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ appointmentId: '00000000-0000-4000-8000-000000000001', bookingUrl: hostedUrl }) });
    });

    await page.goto('/');
    await page.getByLabel('Email address').fill(fakeEmail);
    await page.getByLabel('Password').fill(fakePassword);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: 'Schedule appointment', exact: true }).click();

    const createButton = page.getByRole('button', { name: 'Create booking link' });
    await expect(createButton).toBeDisabled();
    await page.getByLabel('Client').selectOption(clientId);
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await expect(page.getByText('Helios booking link ready for Playwright Test Client')).toBeVisible();
    await expect(page.getByRole('link', { name: /Preview page/i })).toHaveAttribute('href', hostedUrl);
    await expect(page.getByText(/expires after 72 hours/i)).toBeVisible();
  });
});

test.describe('Public hosted booking page', () => {
  for (const [state, message] of [
    ['expired', 'It has expired.'],
    ['used', 'It has already been used.'],
    ['invalid', 'Please contact your therapist for a new booking link.']
  ]) {
    test(`shows ${state} link state without authentication`, async ({ page }) => {
      await page.route('**/api/booking/**', route => route.fulfill({ status: state === 'invalid' ? 404 : 410, contentType: 'application/json', body: JSON.stringify({ state }) }));
      await page.goto('/book/test-token');
      await expect(page.getByTestId('public-booking-page')).toBeVisible();
      await expect(page.getByText('This booking link is no longer available')).toBeVisible();
      await expect(page.getByText(message, { exact: false })).toBeVisible();
      await expect(page.getByTestId('login-page')).toHaveCount(0);
    });
  }

  test('shows therapist branding and the Zoom handoff for a valid link', async ({ page }) => {
    await page.route('**/api/booking/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        state: 'available',
        therapist: { name: 'Dr Test Therapist', practiceName: 'Test Therapy Practice', professionalTitle: 'Psychotherapist' },
        bookingUrl: 'https://scheduler.zoom.us/t/private-single-use-link',
        expiresAt: '2026-08-20T18:00:00.000Z'
      })
    }));

    await page.goto('/book/test-token');
    await expect(page.getByRole('heading', { name: 'Book your appointment' })).toBeVisible();
    await expect(page.getByText('Test Therapy Practice')).toBeVisible();
    await expect(page.getByText('Psychotherapist')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose a time' })).toHaveAttribute('href', 'https://scheduler.zoom.us/t/private-single-use-link');
    await expect(page.getByTestId('login-page')).toHaveCount(0);
  });
});
