import { test, expect } from '@playwright/test';

test.describe('Zoom My Notes transcript inbox', () => {
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
  });

  test('shows a My Notes transcript in the existing protected triage workflow', async ({ page }) => {
    await page.route('**/api/zoom/transcripts*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transcripts: [{
            id: 'note-transcript-1',
            noteId: 'note-123',
            meetingId: '987654321',
            structuredTranscript: {
              speakers: [{ speaker_id: '1', display_name: 'Therapist' }],
              items: [{ speaker_id: '1', start_time: '00:00:01.000', text: 'Welcome to the session.' }]
            },
            format: 'ZOOM_MY_NOTES',
            text: '[00:00:01.000] Therapist: Welcome to the session.',
            source: 'zoom_my_notes',
            status: 'unassigned',
            clientId: null,
            sessionRef: null,
            receivedAt: '2026-08-21T14:00:00.000Z',
            updatedAt: '2026-08-21T14:00:00.000Z',
            requestedLens: null,
            sourceRetention: 'keep_until_review',
            reviewChoicesSavedAt: null,
            completedAt: null
          }]
        })
      });
    });

    await page.goto('/transcripts');
    await performLogin(page);
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 15000 });

    // Current auth flow returns to the default workspace after sign-in.
    // Navigate explicitly to the protected transcript route once the session exists.
    await page.goto('/transcripts');
    await expect(page.getByRole('heading', { name: 'Transcript Inbox' })).toBeVisible({ timeout: 15000 });

    const row = page.getByRole('button', { name: /Meeting 987654321/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Needs client');

    await row.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Zoom meeting 987654321' })).toBeVisible();
    await expect(page.getByText('Helio will not guess.')).toBeVisible();

    await page.getByRole('button', { name: 'View original transcript' }).click();
    await expect(page.getByText('[00:00:01.000] Therapist: Welcome to the session.')).toBeVisible();
  });
});
