import { test, expect } from '@playwright/test';

test.describe('Session Workspace Working Material', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'ssssssss-ssss-4sss-8sss-ssssssssssss';

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

    // Mock profiles - Supabase might use .single() or array depending on helper, 
    // but the task specifically mentions clients and sessions REST mocks should be single objects.
    await page.route('**/rest/v1/profiles*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: userId, full_name: 'Test Therapist', role: 'therapist' })
    }));

    // Mock clients - MUST be a single object, not array
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
            reference: 'test-ref',
            current_focus: 'Test focus',
            archived: false,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          })
        });
      }
      route.continue();
    });

    // Mock sessions - MUST be a single object, not array
    await page.route('**/rest/v1/sessions*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${sessionId}`) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: sessionId,
            client_id: clientId,
            occurred_at: '2026-08-12T10:00:00.000Z',
            status: 'in_progress',
            workflow_status: 'no_further_action',
            notes: '',
            notes_status: 'draft',
            version: 1,
            created_at: '2026-08-12T10:00:00Z',
            updated_at: '2026-08-12T10:00:00Z'
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
    
    // We expect the workspace to load and show the client name and date
    await expect(page.getByText('Session Workspace')).toBeVisible();
    await expect(page.getByText('Test Client')).toBeVisible();
    // occurred_at is 2026-08-12, workspace renders it as "August 12, 2026"
    await expect(page.getByText('August 12, 2026')).toBeVisible();
    
    // Ensure we are not on a /clients/undefined link
    const backLink = page.getByRole('link', { name: '←' });
    await expect(backLink).toHaveAttribute('href', `/clients/${clientId}`);
  }

  test('displays working material notice in clinical record preparation state', async ({ page }) => {
    await openWorkspace(page);

    // Navigate using button "4 Clinical Record"
    await page.getByRole('button', { name: /Clinical Record/ }).click();

    // Verify the safety notice is present
    const noticeText = 'Therapist reflection is private working material and is not automatically included in the clinical record.';
    await expect(page.getByText(noticeText)).toBeVisible();
  });

  test('displays working material notice after preparing empty clinical summary draft', async ({ page }) => {
    await openWorkspace(page);

    await page.getByRole('button', { name: /Clinical Record/ }).click();

    // Prepare draft
    await page.getByRole('button', { name: /Prepare Empty Clinical Summary Draft/i }).click();

    // The boundary should remain clear
    const draftNoticeText = 'Therapist reflection is private working material and is not automatically included.';
    await expect(page.getByText(draftNoticeText)).toBeVisible();
  });
});
