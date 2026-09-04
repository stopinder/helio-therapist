import { test, expect } from '@playwright/test';

test.describe('Calendar Session Start Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL || 'therapist@example.com';
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD || 'password123';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  let failSessionCreation = false;

  test.beforeEach(async ({ page }) => {
    failSessionCreation = false;
    // 1. Mock Auth
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: 'mock-user-id', email }
        })
      });
    });

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-user-id',
            email,
            user_metadata: { full_name: 'Robert' },
            aud: 'authenticated',
            role: 'authenticated'
          }
        })
      });
    });

    // 2. Mock Profile
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', full_name: 'Robert', role: 'therapist' }])
      });
    });

    // 3. Mock External APIs
    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false })
      });
    });

    await page.route('**/api/zoom/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: false })
      });
    });

    // 4. Mock Clients
    await page.route('**/rest/v1/clients*', async (route) => {
      const isSingle = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      const clientData = {
        id: clientId,
        user_id: 'mock-user-id',
        display_name: 'Test Client',
        archived: false,
        reference: 'test@example.com',
        current_focus: 'Anxiety',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? clientData : [clientData])
      });
    });

    // 5. Mock Appointments
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const start = today.toISOString();
    const end = new Date(today.getTime() + 3600000).toISOString();

    await page.route('**/rest/v1/appointments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            client_id: clientId,
            status: 'scheduled',
            starts_at: start,
            ends_at: end,
            timezone: 'UTC',
            zoom_meeting_id: null
          }
        ])
      });
    });

    // 6. Centralized Sessions Mock
    await page.route('**/rest/v1/sessions*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const isSingle = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');

      if (method === 'GET') {
        if (url.includes(`id=eq.${sessionId}`)) {
          // Session workspace load
          const sessionData = {
            id: sessionId,
            client_id: clientId,
            occurred_at: new Date().toISOString(),
            status: 'in_progress',
            workflow_status: 'no_further_action',
            notes: '',
            notes_status: 'draft',
            version: 1
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(isSingle ? sessionData : [sessionData])
          });
        } else {
          // In-progress lookup or history
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      } else if (method === 'POST') {
        if (failSessionCreation) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Database error' })
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: sessionId,
              client_id: clientId,
              occurred_at: new Date().toISOString(),
              status: 'in_progress',
              workflow_status: 'no_further_action',
              notes: '',
              notes_status: 'draft',
              version: 1
            })
          });
        }
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').waitFor({ state: 'visible' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('therapist starts a session from Calendar', async ({ page }) => {
    // 1. Navigate to Calendar
    await page.getByRole('navigation').getByRole('link', { name: /Calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);

    // 2. Find and click the appointment in the timed grid
    // We use the timed grid (main canvas) to verify interactive calendar event placement
    const appointment = page.getByTestId('timed-grid-scroll').getByRole('button', { name: /Appointment with Test Client/i });
    await expect(appointment).toBeVisible();
    await appointment.click();

    // 3. Click Clinical Workspace
    const startButton = page.getByRole('button', { name: 'Clinical Workspace' });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 4. Verify navigation
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}/sessions/${sessionId}`));
    await expect(page.getByRole('navigation', { name: 'Session workspace navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Client' })).toBeVisible();
  });

  test('therapist starts a session from Overview', async ({ page }) => {
    // 1. Ensure we are on Overview
    await page.getByRole('navigation').getByRole('link', { name: /Overview/i }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('heading', { name: /Good afternoon|Good morning|Good evening/i })).toBeVisible();

    // 2. Find the singular Clinical Workspace action in the next-session focal point
    const startButton = page.getByRole('button', { name: 'Clinical Workspace' });
    await expect(startButton).toBeVisible();

    // 3. Click Start Session
    await startButton.click();

    // 4. Verify navigation
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}/sessions/${sessionId}`));
    await expect(page.getByRole('navigation', { name: 'Session workspace navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Client' })).toBeVisible();
  });

  test('shows error message when session creation fails', async ({ page }) => {
    failSessionCreation = true;

    await page.getByRole('navigation').getByRole('link', { name: /Calendar/i }).click();
    // Scope to timed grid to avoid ambiguity with the agenda sidebar
    const appointment = page.getByTestId('timed-grid-scroll').getByRole('button', { name: /Appointment with Test Client/i });
    await appointment.click();

    const startButton = page.getByRole('button', { name: 'Clinical Workspace' });
    await startButton.click();

    // Verify error message
    await expect(page.getByText('Couldn’t open the session workspace. Please try again.')).toBeVisible();
  });
});
