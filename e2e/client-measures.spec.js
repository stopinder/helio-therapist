import { test, expect } from '@playwright/test';

test.describe('Client Measures History', () => {
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

    // 4. Mock Resource Assignments (Measures)
    await page.route('**/api/resource-assignments?clientId=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assignments: [
            {
              id: 'a1',
              resource_versions: { 
                resource_id: 'phq9', 
                client_title: 'PHQ-9', 
                resource_library_items: { id: 'phq9', title: 'PHQ-9', resource_kind: 'outcome_measure' } 
              },
              outcome_measure_results: { 
                id: 'r1', 
                scores: { total: 14 }, 
                calculation_version: 'phq-9-v1', 
                completed_at: '2026-07-20T10:00:00Z' 
              }
            },
            {
              id: 'a2',
              resource_versions: { 
                resource_id: 'phq9', 
                client_title: 'PHQ-9', 
                resource_library_items: { id: 'phq9', title: 'PHQ-9', resource_kind: 'outcome_measure' } 
              },
              outcome_measure_results: { 
                id: 'r2', 
                scores: { total: 8 }, 
                calculation_version: 'phq-9-v1', 
                completed_at: '2026-08-12T10:00:00Z' 
              }
            }
          ]
        })
      });
    });

    // 5. Mock other necessary APIs to prevent noise
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

  test('should display neutral measure history in the Measures tab', async ({ page }) => {
    // 1. Navigate to Client Workspace
    await page.goto(`/clients/${clientId}`);
    await expect(page.getByRole('heading', { name: 'Test Client' })).toBeVisible();

    // 2. Select Measures tab
    const measuresTab = page.getByRole('button', { name: 'Measures' });
    await expect(measuresTab).toBeVisible();
    await measuresTab.click();

    // 3. Verify Measures header
    await expect(page.locator('#measures-heading')).toContainText('Measures');
    await expect(page.getByText('Outcome-measure results recorded for this client over time.')).toBeVisible();

    // 4. Verify Neutral Results Display
    const phq9Section = page.locator('article', { hasText: 'PHQ-9' });
    await expect(phq9Section).toBeVisible();
    
    // Check latest result (score 8 from 2026-08-12)
    const latestResultContainer = phq9Section.locator('div', { hasText: 'Latest result' }).first();
    await expect(latestResultContainer.locator('strong')).toHaveText('8');
    await expect(latestResultContainer.getByText('12 Aug 2026')).toBeVisible();

    // Check historical results list
    const results = phq9Section.locator('div.grid');
    await expect(results).toHaveCount(2);
    
    // First result in list (newest)
    await expect(results.nth(0)).toContainText('12 Aug 2026');
    await expect(results.nth(0)).toContainText('8');

    // Second result in list (older)
    await expect(results.nth(1)).toContainText('20 Jul 2026');
    await expect(results.nth(1)).toContainText('14');

    // 5. Verify no AI interpretation
    const textContent = await page.innerText('body');
    expect(textContent).not.toContain('improving');
    expect(textContent).not.toContain('worsening');
    expect(textContent).not.toContain('AI interpretation');

    // 6. Verify "Send measure" is available
    await expect(page.getByRole('button', { name: 'Send measure' })).toBeVisible();
  });
});
