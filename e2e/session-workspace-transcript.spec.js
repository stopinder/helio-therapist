import { test, expect } from '@playwright/test';

test.describe('Session Workspace transcript source', () => {
  const userId = 'mock-user-id';
  const clientId = 'client-123';
  const sessionId = 'session-456';

  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'mock-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user: { id: userId, email: 'therapist@example.com', role: 'authenticated', aud: 'authenticated' } }) }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, email: 'therapist@example.com' }) }));
    await page.route('**/api/google/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) }));
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: userId, full_name: 'Test Therapist', role: 'therapist' }]) }));
    await page.route('**/rest/v1/clients*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: clientId, display_name: 'Test Client', archived: false }]) }));
    await page.route('**/rest/v1/sessions*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: sessionId, client_id: clientId, occurred_at: '2026-08-02T10:00:00.000Z', status: 'completed', notes: '', version: 1 }) }));
  });

  async function openWorkspace(page) {
    await page.goto(`/clients/${clientId}/sessions/${sessionId}`);
    if (await page.getByTestId('login-page').isVisible()) {
      await page.getByLabel('Email address').fill('therapist@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
  }

  test('keeps Professional Development outside the four-stage clinical workflow', async ({ page }) => {
    await page.route('**/api/zoom/transcripts?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [] }) }));
    await openWorkspace(page);

    const workflow = page.getByRole('navigation', { name: 'Clinical workflow stages' });
    await expect(workflow.getByRole('button')).toHaveCount(4);
    await expect(workflow.getByRole('button', { name: /Session Capture/ })).toBeVisible();
    await expect(workflow.getByRole('button', { name: /Notes/ })).toBeVisible();
    await expect(workflow.getByRole('button', { name: /Reflection/ })).toBeVisible();
    await expect(workflow.getByRole('button', { name: /Clinical Record/ })).toBeVisible();
    await expect(workflow.getByText('Professional Development')).toHaveCount(0);

    const professionalDevelopment = page.getByRole('button', { name: 'Professional Development' });
    await expect(professionalDevelopment).toHaveAttribute('aria-pressed', 'false');
    await professionalDevelopment.click();
    await expect(professionalDevelopment).toHaveAttribute('aria-pressed', 'true');
    await expect(workflow.getByRole('button', { name: /Clinical Record/ })).not.toHaveAttribute('aria-current', 'step');
  });

  test('renders the exact linked Zoom source without demonstration fallback', async ({ page }) => {
    const sourceText = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nTest source transcript';
    await page.route('**/api/zoom/transcripts?*', async route => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('sessionRef')).toBe(sessionId);
      expect(url.searchParams.get('clientId')).toBe(clientId);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [{ id: 'transcript-1', sessionRef: sessionId, clientId, text: sourceText }] }) });
    });
    await openWorkspace(page);
    await expect(page.getByRole('heading', { name: 'Source material' })).toBeVisible();
    await expect(page.getByText('Test source transcript')).toBeVisible();
    await expect(page.getByText(/demonstration data/i)).toHaveCount(0);
  });

  test('shows an intentional empty state when no transcript is linked', async ({ page }) => {
    await page.route('**/api/zoom/transcripts?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [] }) }));
    await openWorkspace(page);
    await expect(page.getByRole('heading', { name: 'No linked transcript' })).toBeVisible();
  });

  test('shows a recoverable error and retries the transcript request', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/zoom/transcripts?*', route => {
      requests += 1;
      if (requests === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary transcript error' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [{ id: 'transcript-1', sessionRef: sessionId, clientId, text: 'Recovered source transcript' }] }) });
    });
    await openWorkspace(page);
    await expect(page.getByRole('heading', { name: 'Transcript unavailable' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Recovered source transcript')).toBeVisible();
    expect(requests).toBe(2);
  });
});
