import { test, expect } from '@playwright/test';

test.describe('Session Workspace Working Material', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const email = 'therapist@example.com';
  const password = 'password123';

  function base64Url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  const now = Math.floor(Date.now() / 1000);
  const mockToken = [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({ aud: 'authenticated', exp: now + 3600, iat: now, sub: userId, email, role: 'authenticated' }),
    'playwright-signature'
  ].join('.');

  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: mockToken, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: userId, email, role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Test Therapist' } } }) }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, email, user_metadata: { full_name: 'Test Therapist' } }) }));
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, full_name: 'Test Therapist', role: 'therapist' }) }));
    await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.route('**/rest/v1/clients*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${clientId}`) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: clientId, user_id: userId, display_name: 'Test Client', reference: 'test-ref', current_focus: 'Test focus', archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }) });
      return route.continue();
    });

    await page.route('**/rest/v1/sessions*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${sessionId}`) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: sessionId, client_id: clientId, occurred_at: '2026-08-12T10:00:00.000Z', status: 'in_progress', workflow_status: 'no_further_action', notes: '', notes_status: 'draft', version: 1, created_at: '2026-08-12T10:00:00Z', updated_at: '2026-08-12T10:00:00Z' }) });
      return route.continue();
    });

    await page.route('**/api/zoom/transcripts*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [] }) }));
  });

  async function openWorkspace(page) {
    const workspaceUrl = `/clients/${clientId}/sessions/${sessionId}`;
    await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded' });
    const loginEmail = page.getByLabel('Email address');
    const workspaceShell = page.getByTestId('workspace-shell');
    await expect(loginEmail.or(workspaceShell)).toBeVisible({ timeout: 15000 });
    if (await loginEmail.isVisible()) {
      await loginEmail.fill(email);
      await page.getByLabel('Password').fill(password);
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
      await expect(workspaceShell).toBeVisible({ timeout: 15000 });
      await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded' });
    }
    await expect(workspaceShell).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Test Client')).toBeVisible();
    await expect(page.getByText('August 12, 2026')).toBeVisible();
    await expect(page.getByRole('link', { name: '←' })).toHaveAttribute('href', `/clients/${clientId}`);
  }

  test('displays working material notice in clinical record preparation state', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button', { name: /Clinical Record/ }).click();
    await expect(page.getByText('Therapist reflection is private working material and is not automatically included in the clinical record.')).toBeVisible();
  });

  test('displays working material notice after preparing empty clinical summary draft', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button', { name: /Clinical Record/ }).click();
    await page.getByRole('button', { name: /Prepare Empty Clinical Summary Draft/i }).click();
    await expect(page.getByText('Therapist reflection is private working material and is not automatically included.')).toBeVisible();
  });
});
