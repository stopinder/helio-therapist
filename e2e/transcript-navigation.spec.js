import { test, expect } from '@playwright/test';

test.describe('Transcript to Session Navigation', () => {
  const MOCK_EMAIL = 'therapist@example.com';
  const MOCK_PASSWORD = 'password123';
  const MOCK_USER_ID = 'mock-user-id';

  async function login(page) {
    // Mock Supabase Auth
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: MOCK_USER_ID, email: MOCK_EMAIL, role: 'authenticated', aud: 'authenticated' }
        })
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_USER_ID, email: MOCK_EMAIL })
      });
    });

    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: MOCK_USER_ID, full_name: 'Robert Ormiston', role: 'therapist' }])
      });
    });

    // Mock clients
    await page.route('**/rest/v1/clients*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'client-123', display_name: 'John Doe', archived: false }])
      });
    });

    // Mock sessions for the client
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'session-456', clientId: 'client-123', status: 'completed', createdAt: new Date().toISOString() }])
      });
    });

    await page.goto('/transcripts');
    
    if (await page.getByTestId('login-page').isVisible()) {
      await page.getByLabel('Email address').fill(MOCK_EMAIL);
      await page.getByLabel('Password').fill(MOCK_PASSWORD);
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
    
    await expect(page.getByTestId('workspace-shell')).toBeVisible({ timeout: 15000 });
  }

  test('Open session marks transcript complete and navigates', async ({ page }) => {
    const transcript = {
      id: 'trans-1',
      meetingId: '999',
      receivedAt: new Date().toISOString(),
      status: 'assigned',
      clientId: 'client-123',
      sessionRef: 'session-456',
      reviewChoicesSavedAt: new Date().toISOString(),
      completedAt: null
    };

    await page.route('**/api/zoom/transcripts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify({ transcripts: [transcript] }) });
      } else if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.markComplete).toBe(true);
        await route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            transcript: { ...transcript, completedAt: new Date().toISOString() } 
          }) 
        });
      }
    });

    await login(page);
    await page.getByRole('button', { name: /Zoom meeting 999/ }).click();
    
    // "Open session" should be visible for "review-saved" state
    const openBtn = page.getByRole('button', { name: 'Open session' });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Verify navigation to SessionWorkspace
    await expect(page).toHaveURL(/\/clients\/client-123\/sessions\/session-456/);
  });

  test('View session for already completed transcript navigates without completion request', async ({ page }) => {
    const transcript = {
      id: 'trans-2',
      meetingId: '888',
      receivedAt: new Date().toISOString(),
      status: 'assigned',
      clientId: 'client-123',
      sessionRef: 'session-456',
      reviewChoicesSavedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    let patchCalled = false;
    await page.route('**/api/zoom/transcripts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify({ transcripts: [transcript] }) });
      } else if (route.request().method() === 'PATCH') {
        patchCalled = true;
        await route.fulfill({ status: 200, body: JSON.stringify({ transcript }) });
      }
    });

    await login(page);
    await page.getByRole('button', { name: 'Completed' }).click();
    await page.getByRole('button', { name: /Zoom meeting 888/ }).click();
    
    const viewBtn = page.getByRole('button', { name: 'View session' });
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    await expect(page).toHaveURL(/\/clients\/client-123\/sessions\/session-456/);
    expect(patchCalled).toBe(false);
  });

  test('Failed completion does not navigate', async ({ page }) => {
    const transcript = {
      id: 'trans-3',
      meetingId: '777',
      receivedAt: new Date().toISOString(),
      status: 'assigned',
      clientId: 'client-123',
      sessionRef: 'session-456',
      reviewChoicesSavedAt: new Date().toISOString(),
      completedAt: null
    };

    await page.route('**/api/zoom/transcripts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify({ transcripts: [transcript] }) });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ error: 'Failed to complete' }) 
        });
      }
    });

    await login(page);
    await page.getByRole('button', { name: /Zoom meeting 777/ }).click();
    
    await page.getByRole('button', { name: 'Open session' }).click();

    // Should show error and stay on transcripts page
    await expect(page.getByText('Failed to complete')).toBeVisible();
    await expect(page).toHaveURL(/\/transcripts/);
  });
});
