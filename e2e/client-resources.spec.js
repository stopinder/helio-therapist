import { test, expect } from '@playwright/test';

test.describe('Client Resources History', () => {
  const email = 'therapist@example.com';
  const password = 'password123';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  test.beforeEach(async ({ page }) => {
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
          user: { id: 'mock-user-id', email, aud: 'authenticated', role: 'authenticated' }
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

    // 3. Mock Clients
    await page.route('**/rest/v1/clients*', async (route) => {
      const isSingle = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      const clientData = {
        id: clientId,
        user_id: 'mock-user-id',
        display_name: 'Test Client',
        archived: false
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? clientData : [clientData])
      });
    });

    // 4. Mock Resource Assignments
    await page.route('**/api/resource-assignments?clientId=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assignments: [
            {
              id: 'a1',
              status: 'sent',
              sent_at: '2026-08-10T10:00:00Z',
              resource_versions: { 
                client_title: 'Active Worksheet', 
                resource_library_items: { resource_kind: 'worksheet' } 
              },
              client_requests: { due_at: '2026-08-15T10:00:00Z' }
            },
            {
              id: 'a2',
              status: 'reviewed',
              sent_at: '2026-08-01T10:00:00Z',
              completed_at: '2026-08-02T10:00:00Z',
              reviewed_at: '2026-08-04T10:00:00Z',
              resource_versions: { 
                client_title: 'Completed Document', 
                resource_library_items: { resource_kind: 'document' } 
              }
            }
          ]
        })
      });
    });

    // 5. Mock other necessary APIs
    await page.route('**/api/google/status', route => route.fulfill({ status: 200, body: JSON.stringify({ connected: false }) }));
    await page.route('**/api/zoom/status', route => route.fulfill({ status: 200, body: JSON.stringify({ connected: false }) }));
    await page.route('**/rest/v1/appointments*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/sessions*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/client_documents*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/timeline_events*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/client-follow-ups*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/clinical-attention*', route => route.fulfill({ status: 200, body: JSON.stringify({ items: [] }) }));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should display active and completed resources in the Resources tab', async ({ page }) => {
    await page.goto(`/clients/${clientId}`);
    await expect(page.getByRole('heading', { name: 'Test Client' })).toBeVisible();

    const resourcesTab = page.getByRole('button', { name: 'Resources' });
    await expect(resourcesTab).toBeVisible();
    await resourcesTab.click();

    // Verify Resources header
    await expect(page.locator('#resources-heading')).toContainText('Resources');
    await expect(page.getByText('Materials and activities sent to this client.')).toBeVisible();

    // Verify Active section
    const activeSection = page.getByRole('region', { name: 'Active' });
    await expect(activeSection).toBeVisible();
    await expect(activeSection.locator('article', { hasText: 'Active Worksheet' })).toBeVisible();
    await expect(activeSection.locator('article', { hasText: 'Worksheet' })).toBeVisible();
    await expect(activeSection.locator('article', { hasText: 'Sent 10 Aug 2026' })).toBeVisible();
    await expect(activeSection.locator('article', { hasText: 'Due 15 Aug 2026' })).toBeVisible();

    // Verify Completed section
    const completedSection = page.getByRole('region', { name: 'Completed' });
    await expect(completedSection).toBeVisible();
    await expect(completedSection.locator('article', { hasText: 'Completed Document' })).toBeVisible();
    await expect(completedSection.locator('article', { hasText: 'Document' })).toBeVisible();
    await expect(completedSection.locator('article', { hasText: 'Reviewed 4 Aug 2026' })).toBeVisible();

    // Verify "Send resource" is available
    await expect(page.getByRole('button', { name: 'Send resource' })).toBeVisible();
  });
});
