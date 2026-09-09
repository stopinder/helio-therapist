import { test, expect } from '@playwright/test';

test.describe('Zoom Notes Button Visibility', () => {
  const MOCK_EMAIL = 'therapist@example.com';
  const MOCK_PASSWORD = 'password123';
  const MOCK_USER_ID = 'mock-user-id';

  function base64Url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  const now = Math.floor(Date.now() / 1000);
  const MOCK_TOKEN = [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({
      aud: 'authenticated',
      exp: now + 3600,
      iat: now,
      sub: MOCK_USER_ID,
      email: MOCK_EMAIL,
      role: 'authenticated'
    }),
    'playwright-signature'
  ].join('.');

  async function performLogin(page) {
    if (await page.getByLabel('Email address').isVisible()) {
      await page.getByLabel('Email address').fill(MOCK_EMAIL);
      await page.getByLabel('Password').fill(MOCK_PASSWORD);
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: {
            id: MOCK_USER_ID,
            email: MOCK_EMAIL,
            role: 'authenticated',
            aud: 'authenticated',
            user_metadata: { full_name: 'Test Therapist' }
          }
        })
      });
    });

    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_USER_ID,
          email: MOCK_EMAIL,
          user_metadata: { full_name: 'Test Therapist' }
        })
      });
    });

    await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: MOCK_USER_ID, full_name: 'Test Therapist', role: 'therapist' }])
      });
    });

    await page.route('**/rest/v1/clients*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'client-1', display_name: 'Test Client', archived: false }])
      });
    });

    await page.route('**/rest/v1/sessions*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/google/status', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
    });

    await page.route('**/api/zoom/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, my_notes_ready: true })
      });
    });

    await page.route('**/rest/v1/zoom_transcripts*', async route => {
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         headers: { 'Content-Range': '0-0/0' },
         body: JSON.stringify([])
       });
    });
  });

  test('button is visible initially and changes style when clicked', async ({ page }) => {
    let reconcileCalled = false;
    await page.route('**/api/zoom/reconcile-my-notes', async route => {
      reconcileCalled = true;
      // Delay response to simulate the 3-4 seconds delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ imported: 0, imports: [] })
      });
    });

    await page.goto('/');
    
    // Check if we need to login
    if (await page.getByLabel('Email address').isVisible({ timeout: 5000 })) {
        await page.getByLabel('Email address').fill(MOCK_EMAIL);
        await page.getByLabel('Password').fill(MOCK_PASSWORD);
        await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }

    // Instead of waiting for shell, wait for the button directly
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('URL:', page.url());
    console.log('BODY:', (await page.locator('body').innerText()).slice(0, 3000));
    console.log('BUTTONS:', await page.getByRole('button').allTextContents());

    const button = page.getByRole('button', { name: 'Check for new notes' });
    
    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'failure.png' });
    console.log('Page content:', await page.content());

    await expect(button).toBeVisible({ timeout: 30000 });

    // Check initial styles (approximate, based on tailwind/main.css)
    const initialBg = await button.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log('Initial BG:', initialBg);

    // Click and check styles while loading
    await button.click();
    await expect(button).toHaveText('Checking…');
    
    // During "Checking...", the button is disabled
    const disabledBg = await button.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const disabledColor = await button.evaluate(el => window.getComputedStyle(el).color);
    const parentBg = await button.evaluate(el => window.getComputedStyle(el.parentElement).backgroundColor);
    const grandparentBg = await button.evaluate(el => window.getComputedStyle(el.parentElement.parentElement).backgroundColor);
    
    console.log('Disabled BG:', disabledBg);
    console.log('Disabled Color:', disabledColor);
    console.log('Parent BG:', parentBg);
    console.log('Grandparent BG:', grandparentBg);

    // If they are very close, it might look like it's gone
    expect(reconcileCalled).toBe(true);

    await expect(button).toHaveText('Check for new notes', { timeout: 5000 });
  });
});
