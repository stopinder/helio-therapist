import { test, expect } from '@playwright/test';

test.describe('Zoom Meeting Launch', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'ssssssss-ssss-4sss-8sss-ssssssssssss';
  const mockZoomUrl = 'https://zoom.us/s/mock-meeting-id?zak=mock-token';

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: userId,
        email: 'therapist@example.com',
        user_metadata: { full_name: 'Test Therapist' }
      })
    }));

    await page.route('**/auth/v1/token*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: userId,
            email: 'therapist@example.com',
            role: 'authenticated',
            aud: 'authenticated',
            user_metadata: { full_name: 'Test Therapist' }
          }
        })
      })
    );

    // Mock profiles
    await page.route('**/rest/v1/profiles*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: userId, full_name: 'Test Therapist', role: 'therapist' })
    }));

    // Mock clients
    await page.route('**/rest/v1/clients*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${clientId}`) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: clientId,
            user_id: userId,
            display_name: 'Test Client',
            archived: false
          })
        });
      }
      route.continue();
    });

    // Mock sessions
    await page.route('**/rest/v1/sessions*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${sessionId}`) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: sessionId,
            client_id: clientId,
            user_id: userId,
            occurred_at: '2026-08-12T10:00:00.000Z',
            started_at: '2026-08-12T10:00:00.000Z',
            status: 'in_progress',
            notes: ''
          })
        });
      }
      route.continue();
    });

    // Mock transcript
    await page.route('**/api/zoom/transcripts*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcripts: [] })
    }));
  });

  async function openWorkspace(page) {
    await page.goto(`/clients/${clientId}/sessions/${sessionId}`);
    
    if (await page.getByLabel('Email address').isVisible()) {
      await page.getByLabel('Email address').fill('therapist@example.com');
      await page.getByLabel('Password').fill('password123');
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
    
    await expect(page.getByText('Session Workspace')).toBeVisible();
    await expect(page.getByText('Test Client')).toBeVisible();
  }

  test('therapist joins a Zoom session from workspace using server-resolved URL', async ({ page, context }) => {
    // Mock the start-session API
    await page.route('**/api/zoom/start-session', async route => {
      const request = route.request();
      expect(request.method()).toBe('POST');
      const body = request.postDataJSON();
      expect(body.clientId).toBe(clientId);
      expect(body.sessionRef).toBe(sessionId);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meetingId: '123456789',
          startUrl: mockZoomUrl,
          source: 'created'
        })
      });
    });

    await openWorkspace(page);

    // The button label should be "Join Video Session" or "Return to Video Session"
    const videoActionButton = page.getByRole('button', { name: /Join Video Session|Return to Video Session/i });
    await expect(videoActionButton).toBeVisible();

    // Monitor for new page (popup)
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      videoActionButton.click()
    ]);

    // Verify it attempted to open the correct URL
    expect(newPage.url()).toBe(mockZoomUrl);
  });

  test('displays a useful error message when start-session fails', async ({ page }) => {
    const errorMessage = 'Connect Zoom in Settings before joining a Zoom session.';
    
    await page.route('**/api/zoom/start-session', route => route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage })
    }));

    await openWorkspace(page);

    const videoActionButton = page.getByRole('button', { name: /Join Video Session|Return to Video Session/i });
    await videoActionButton.click();

    // The error should be displayed in the header
    await expect(page.getByRole('alert')).toHaveText(errorMessage);
  });
});
