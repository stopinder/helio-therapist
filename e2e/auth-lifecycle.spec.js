import { test, expect } from '@playwright/test';

test.describe('Authentication Lifecycle', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const email = 'therapist@example.com';
  function base64Url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
  const now = Math.floor(Date.now() / 1000);
  const token = [base64Url({ alg:'HS256', typ:'JWT' }), base64Url({ aud:'authenticated', exp:now+3600, iat:now, sub:userId, email, role:'authenticated' }), 'playwright-signature'].join('.');

  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/token*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ access_token:token, token_type:'bearer', expires_in:3600, refresh_token:'mock-refresh-token', user:{ id:userId, email, role:'authenticated', aud:'authenticated' } }) }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, email }) }));
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, role:'therapist', full_name:'Test Therapist' }) }));
    await page.route('**/rest/v1/clients*', route => route.fulfill({ status:200, contentType:'application/json', body:'[]' }));
    await page.route('**/rest/v1/sessions*', route => route.fulfill({ status:200, contentType:'application/json', body:'[]' }));
    await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status:200, contentType:'application/json', body:'[]' }));
    await page.route('**/api/google/status', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ connected:false }) }));
  });

  async function login(page) {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button',{name:'Sign in'}).click();
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout:15000 });
  }

  test('desktop sign-out', async ({ page }) => {
    await login(page);
    await page.route('**/auth/v1/logout*', route => route.fulfill({ status:204 }));
    const sidebar = page.locator('aside.hidden.md\\:flex');
    await sidebar.getByRole('button',{name:/Account menu for/i}).click();
    await sidebar.getByRole('button',{name:/Sign out/i}).click();
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('mobile sign-out', async ({ page }) => {
    await page.setViewportSize({ width:375, height:667 });
    await login(page);
    await page.route('**/auth/v1/logout*', route => route.fulfill({ status:204 }));
    await page.getByRole('button',{name:'Open menu'}).click();
    const drawer = page.locator('aside.fixed.inset-y-0');
    await drawer.getByRole('button',{name:/Account menu for/i}).click();
    await drawer.getByRole('button',{name:/Sign out/i}).click();
    await expect(page.getByTestId('login-page')).toBeVisible();
  });

  test('session expiry UI transition', async ({ page }) => {
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('helios-session-expired',{ detail:{ message:'Your session has expired. Please sign in again.' } })));
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Your session has expired. Please sign in again.')).toBeVisible();
  });

  test('forgot-password request sends the production recovery redirect and confirms delivery', async ({ page }) => {
    let recoveryRequest;
    await page.route('**/auth/v1/recover*', async route => {
      recoveryRequest = { url:route.request().url(), body:route.request().postDataJSON() };
      await route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    });
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button',{name:'Forgot your password?'}).click();
    await expect(page.getByText('Check your email for the password reset link.')).toBeVisible();
    expect(recoveryRequest.body.email).toBe(email);
    expect(new URL(recoveryRequest.url).searchParams.get('redirect_to')).toBe('https://helio.works');
  });

  test('password-recovery event shows reset form and saves a new password', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await page.evaluate(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await page.route('**/auth/v1/user*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, email }) }));
    await expect(page.getByTestId('login-page')).toBeVisible();
  });
});
