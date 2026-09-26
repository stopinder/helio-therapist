import { test, expect } from '@playwright/test';

test('therapist schedules cancellation before the first trial charge', async ({ page }) => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const email = 'trial@example.test';
  const now = Math.floor(Date.now() / 1000);
  const trialEnd = '2026-10-26T09:31:56.000Z';
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = [encode({ alg: 'HS256', typ: 'JWT' }), encode({ aud: 'authenticated', exp: now + 3600, iat: now, sub: userId, email, role: 'authenticated' }), 'test-signature'].join('.');
  const user = { id: userId, email, role: 'authenticated', aud: 'authenticated', created_at: '2026-09-26T09:00:00Z' };
  let cancellationRequests = 0;

  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh', user }) }));
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, full_name: 'Trial Therapist' }) }));
  await page.route('**/api/signup/welcome', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/billing/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscription: { status: 'trialing', trial_ends_at: trialEnd, cancel_at_period_end: false }, hasWorkspaceAccess: true }) }));
  await page.route('**/api/billing/cancel-trial', route => {
    cancellationRequests++;
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cancel_at_period_end: true, trial_ends_at: trialEnd }) });
  });
  await page.route('**/api/google/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' }));
  await page.route('**/api/zoom/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' }));

  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('test-password');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('workspace-shell')).toBeVisible();
  await page.goto('/settings');
  const section = page.getByTestId('settings-subscription');
  await expect(section.getByRole('button', { name: 'Cancel trial' })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await section.getByRole('button', { name: 'Cancel trial' }).click();
  await expect(section.getByText('Your trial will end without a charge.')).toBeVisible();
  await expect(section.getByText(/Cancels 26 Oct 2026/)).toBeVisible();
  await expect(section.getByRole('button', { name: 'Cancel trial' })).toHaveCount(0);
  expect(cancellationRequests).toBe(1);
});
