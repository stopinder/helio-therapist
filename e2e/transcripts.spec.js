import { test, expect } from '@playwright/test';

test.describe('Transcripts Workspace', () => {
  const MOCK_EMAIL = 'therapist@example.com';
  const MOCK_PASSWORD = 'password123';
  const MOCK_USER_ID = 'mock-user-id';

  test.beforeEach(async ({ page }) => {
    // Mock Supabase Auth Token (Sign In)
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { 
            id: MOCK_USER_ID, 
            email: MOCK_EMAIL,
            user_metadata: { full_name: 'Robert Ormiston' },
            role: 'authenticated',
            aud: 'authenticated'
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

    // Mock Google API status
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: MOCK_EMAIL })
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

    // Go to the page - should show login initially since localStorage is empty
    await page.goto('/transcripts');
    
    // Perform deterministic login
    if (await page.getByLabel('Email address').isVisible()) {
      await page.getByLabel('Email address').fill(MOCK_EMAIL);
      await page.getByLabel('Password').fill(MOCK_PASSWORD);
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
    
    // Wait for the shell to appear (indicating successful login)
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/transcripts/);
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
    await page.route('**/api/zoom/transcripts', async (route) => {
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
    
    // Verify workspace elements from TranscriptInbox.vue
    await expect(page.getByText('Transcript Inbox')).toBeVisible();
    await expect(page.getByText('Zoom imports')).toBeVisible();
    await expect(page.getByText('Zoom meeting 123456789')).toBeVisible();
    await expect(page.getByText('Needs client')).toBeVisible();
  });

  test('should show empty state when no transcripts exist', async ({ page }) => {
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/zoom/transcripts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcripts: [] })
      });
    });

    await page.goto('/transcripts');
    await expect(page.getByRole('heading', { name: 'Inbox up to date' })).toBeVisible();
    await expect(page.getByText('New Zoom transcripts will appear here')).toBeVisible();
  });

  test('should show error state when API fails', async ({ page }) => {
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/zoom/transcripts', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/transcripts');
    await expect(page.getByText('Inbox unavailable')).toBeVisible();
    await expect(page.getByText('Internal Server Error')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Mock profiles for AuthGate
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', full_name: 'Robert Ormiston', role: 'therapist' }])
      });
    });

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

    await page.route('**/api/zoom/transcripts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcripts: [] })
      });
    });

    await page.goto('/transcripts');
    // Transcripts.vue shows "Loading transcripts..." while listClients() is pending
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
        body: JSON.stringify([{ id: 'client-1', display_name: 'John Doe', archived: false }])
      });
    });

    // Mock transcripts API
    await page.route('**/api/zoom/transcripts', async (route) => {
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
    
    // Click on the transcript to open it
    await page.getByRole('button', { name: /Zoom meeting 123456789/ }).click();
    
    // Verify that the transcript review view is shown
    await expect(page.getByText('Transcript review')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zoom meeting 123456789' })).toBeVisible();
  });
});
