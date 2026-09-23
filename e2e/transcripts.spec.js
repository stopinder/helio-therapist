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
    await page.getByLabel('Email address').fill(MOCK_EMAIL);
    await page.getByLabel('Password').fill(MOCK_PASSWORD);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  }

  async function navigateToTranscripts(page) {
    await page.goto('/sign-in');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await performLogin(page);
    await expect(page).toHaveURL(/\/overview$/);
    await page.getByRole('link', { name: 'Transcript Inbox', exact: true }).click();
    await expect(page).toHaveURL(/\/transcripts$/);
  }

  async function ensureWorkspaceLoaded(page) {
    await navigateToTranscripts(page);
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

    await navigateToTranscripts(page);

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

    await ensureWorkspaceLoaded(page);
    
    // Verify workspace elements from TranscriptInbox.vue
    await expect(
      page.getByRole('heading', {
        name: 'Transcript Inbox',
        level: 1,
        exact: true,
      })
    ).toBeVisible();

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

    await ensureWorkspaceLoaded(page);
    await expect(page.getByRole('heading', { name: 'Inbox up to date', exact: true })).toBeVisible();
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

    try {
      await navigateToTranscripts(page);
      
      // Transcripts.vue shows "Loading transcripts..." while load() is pending
      await expect(page.getByText('Loading transcripts...', { exact: true })).toBeVisible();
    } finally {
      fulfillClients();
    }

    await expect(page.getByRole('heading', { name: 'Inbox up to date', exact: true })).toBeVisible();
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
              text: 'Mock transcript text',
              updatedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    await ensureWorkspaceLoaded(page);
    
    // Click on the transcript to open it
    await page.getByRole('button', { name: /Meeting 123456789/ }).click();
    
    // Verify that the transcript review view is shown
    await expect(page.getByText('Transcript review')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zoom meeting 123456789' })).toBeVisible();
  });

  test.describe('Clear all attention', () => {
    const mockTranscripts = [
      { id: 'trans-1', meetingId: '101', receivedAt: new Date().toISOString(), status: 'unassigned', updatedAt: '2023-01-01T00:00:00Z' },
      { id: 'trans-2', meetingId: '102', receivedAt: new Date().toISOString(), status: 'unassigned', updatedAt: '2023-01-01T00:00:00Z' }
    ];

    test.beforeEach(async ({ page }) => {
      await page.route('**/rest/v1/clients*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });
    });

    test('should clear all items and allow undo', async ({ page }) => {
      let transcripts = [...mockTranscripts];
      
      await page.route('**/api/zoom/transcripts*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts }) });
        } else if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON();
          if (body.action === 'clear-attention') {
            const cleared = transcripts.map(t => ({ ...t, attentionClearedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: cleared }) });
          } else if (body.restoreAttention) {
            const restored = { ...transcripts.find(t => t.id === body.id), attentionClearedAt: null, updatedAt: new Date().toISOString() };
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: restored }) });
          }
        }
      });

      await ensureWorkspaceLoaded(page);
      
      // Verify items are present
      await expect(page.getByText('Meeting 101')).toBeVisible();
      await expect(page.getByText('Meeting 102')).toBeVisible();
      await expect(page.getByText('Needs attention · 2')).toBeVisible();

      // Click Clear all
      await page.getByRole('button', { name: 'Clear all' }).click();

      // Verify empty state in Needs attention
      await expect(page.getByRole('heading', { name: 'Inbox up to date', exact: true })).toBeVisible();
      await expect(page.getByText('2 items cleared from Needs attention.')).toBeVisible();
      await expect(page.getByText('Needs attention · 0')).toBeVisible();

      // Switch to History
      await page.getByRole('button', { name: 'History' }).click();
      await expect(page.getByText('Meeting 101')).toBeVisible();
      await expect(page.getByText('Meeting 102')).toBeVisible();
      await expect(page.getByText('Cleared from inbox', { exact: true }).first()).toBeVisible();

      // Undo
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByText('Clearing undone.')).toBeVisible();
      
      // Switch back to Needs attention
      await page.getByRole('button', { name: 'Needs attention' }).click();
      await expect(page.getByText('Meeting 101')).toBeVisible();
      await expect(page.getByText('Meeting 102')).toBeVisible();
      await expect(page.getByText('Needs attention · 2')).toBeVisible();
    });

    test('should disable Clear all when search is active', async ({ page }) => {
      await page.route('**/api/zoom/transcripts*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: mockTranscripts }) });
      });

      await ensureWorkspaceLoaded(page);
      
      const searchInput = page.getByPlaceholder('Search transcripts');
      await searchInput.fill('101');
      
      const clearAllBtn = page.getByRole('button', { name: 'Clear all' });
      await expect(clearAllBtn).toBeDisabled();
      await expect(clearAllBtn).toHaveAttribute('title', 'Clear your search to clear all attention items.');
    });

    test('should allow individual restoration from History', async ({ page }) => {
      const clearedTranscript = { ...mockTranscripts[0], attentionClearedAt: new Date().toISOString(), text: 'Some text' };
      
      await page.route('**/api/zoom/transcripts*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [clearedTranscript] }) });
        } else if (route.request().method() === 'PATCH' && route.request().postDataJSON().restoreAttention) {
          const restored = { ...clearedTranscript, attentionClearedAt: null, updatedAt: new Date().toISOString() };
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: restored }) });
        }
      });

      await ensureWorkspaceLoaded(page);
      
      // Switch to History
      await page.getByRole('button', { name: 'History' }).click();
      
      // Open the cleared transcript
      await page.getByRole('button', { name: /Meeting 101/ }).click();
      await expect(page.getByText('Transcript cleared from inbox')).toBeVisible();
      
      // Restore
      await page.getByRole('button', { name: 'Return to Needs attention' }).click();
      await expect(page.getByText('Restored to Needs attention.')).toBeVisible();
      
      // Go back to inbox
      await page.getByRole('button', { name: '‹ Transcript Inbox' }).click();
      await page.getByRole('button', { name: 'Needs attention' }).click();
      await expect(page.getByText('Meeting 101')).toBeVisible();
    });
  });
});
