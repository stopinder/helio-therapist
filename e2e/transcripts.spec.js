import { test, expect } from '@playwright/test';

test.describe('Transcripts Workspace', () => {
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

  async function ensureWorkspaceLoaded(page) {
    await performLogin(page);
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 15000 });
  }

  test.beforeEach(async ({ page }) => {
    // Mock Supabase Auth Token (Sign In)
    await page.route('**/auth/v1/token*', async (route) => {
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
            user_metadata: { full_name: 'Robert Ormiston' }
          }
        })
      });
    });

    // Mock Supabase User call
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          id: MOCK_USER_ID, 
          email: MOCK_EMAIL,
          user_metadata: { full_name: 'Robert Ormiston' }
        })
      });
    });

    // Mock Helios profile response
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: MOCK_USER_ID, full_name: 'Robert Ormiston', role: 'therapist' }])
      });
    });

    // Mock sessions for TranscriptInbox
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock Google API status
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: MOCK_EMAIL })
      });
    });
  });

  test('should show error state when API fails', async ({ page }) => {
    // Contract: Generic error messaging that surfaces backend specifics when available.
    // The product intentionally surfaces backend messages to aid therapist troubleshooting.
    const errorMsg = 'Transient API failure';
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/zoom/transcripts*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMsg })
      });
    });

    await page.goto('/transcripts');
    await performLogin(page);

    // User-facing error-state contract
    await expect(page.getByText('Inbox unavailable')).toBeVisible();
    
    // Assert generic alert state
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    
    // Assert intentional surfacing of backend error message
    await expect(alert).toContainText(errorMsg);
  });

  test('should render functional transcript workspace', async ({ page }) => {
    // Mock clients
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'client-1', display_name: 'John Doe', archived: false }])
      });
    });

    // Mock transcripts API
    await page.route('**/api/zoom/transcripts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transcripts: [
            {
              id: 'trans-1',
              meetingId: '123456789',
              receivedAt: new Date().toISOString(),
              status: 'unassigned',
              clientId: null
            }
          ]
        })
      });
    });

    await page.goto('/transcripts');
    await ensureWorkspaceLoaded(page);
    
    // Verify workspace elements from TranscriptInbox.vue
    await expect(page.getByText('Transcript Inbox')).toBeVisible();
    await expect(page.getByText('Zoom imports')).toBeVisible();
    // Use the current UI accessible name pattern
    await expect(page.getByRole('button', { name: /Meeting 123456789/ })).toBeVisible();
    await expect(page.getByText('Needs client')).toBeVisible();
  });

  test('should show empty state when no transcripts exist', async ({ page }) => {
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/zoom/transcripts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcripts: [] })
      });
    });

    await page.goto('/transcripts');
    await ensureWorkspaceLoaded(page);
    await expect(page.getByRole('heading', { name: 'Inbox up to date' })).toBeVisible();
    await expect(page.getByText('New Zoom transcripts will appear here')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Control fulfillment of listClients in Transcripts.vue
    let fulfillClients;
    const clientsPromise = new Promise(resolve => fulfillClients = resolve);

    await page.route('**/rest/v1/clients*', async (route) => {
      await clientsPromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/zoom/transcripts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcripts: [] })
      });
    });

    await page.goto('/transcripts');
    await performLogin(page);
    
    // Transcripts.vue shows "Loading transcripts..." while load() is pending
    await expect(page.getByText('Loading transcripts...')).toBeVisible();
    
    fulfillClients();
    await expect(page.getByRole('heading', { name: 'Inbox up to date' })).toBeVisible();
  });

  test('should be able to open a transcript', async ({ page }) => {
    // Mock clients
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'client-1', display_name: 'John Doe', name: 'John Doe', archived: false }])
      });
    });

    // Mock transcripts API
    await page.route('**/api/zoom/transcripts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transcripts: [
            {
              id: 'trans-1',
              meetingId: '123456789',
              receivedAt: new Date().toISOString(),
              status: 'unassigned',
              clientId: null,
              text: 'Mock transcript text'
            }
          ]
        })
      });
    });

    await page.goto('/transcripts');
    await ensureWorkspaceLoaded(page);
    
    // Click on the transcript to open it
    await page.getByRole('button', { name: /Meeting 123456789/ }).click();
    
    // Verify that the transcript review view is shown
    await expect(page.getByText('Transcript review')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zoom meeting 123456789' })).toBeVisible();
  });
});
