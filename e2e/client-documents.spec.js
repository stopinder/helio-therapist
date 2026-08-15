import { test, expect } from '@playwright/test';

test.describe('Client Documents Refinement', () => {
  const email = 'therapist@example.com';
  const password = 'password123';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const mockDraft = {
    id: 'd1',
    client_id: clientId,
    user_id: 'mock-user-id',
    title: 'Draft Document',
    status: 'draft',
    document_type: 'clinical_summary',
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
    version: 1
  };

  const mockFinalised = {
    id: 'f1',
    client_id: clientId,
    user_id: 'mock-user-id',
    title: 'Finalised Document',
    status: 'completed',
    document_type: 'progress_report',
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T11:00:00Z',
    finalized_at: '2026-08-05T11:00:00Z',
    storage_path: 'documents/f1.pdf',
    version: 2
  };

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

    // 3. Mock other necessary APIs
    await page.route('**/api/google/status', route => route.fulfill({ status: 200, body: JSON.stringify({ connected: false }) }));
    await page.route('**/api/zoom/status', route => route.fulfill({ status: 200, body: JSON.stringify({ connected: false }) }));
    await page.route('**/rest/v1/appointments*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/sessions*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/rest/v1/timeline_events*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/client-follow-ups*', route => route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await page.route('**/api/clinical-attention*', route => route.fulfill({ status: 200, body: JSON.stringify({ items: [] }) }));
    await page.route('**/api/resource-assignments*', route => route.fulfill({ status: 200, body: JSON.stringify({ assignments: [] }) }));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should display refined document hierarchy for active client', async ({ page }) => {
    // Mock Active Client
    await page.route('**/rest/v1/clients*', async (route) => {
      const isSingle = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      const clientData = { id: clientId, user_id: 'mock-user-id', display_name: 'Active Client', archived: false };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? clientData : [clientData]) });
    });

    // Mock Documents
    await page.route('**/rest/v1/documents*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockDraft, mockFinalised]) });
    });

    await page.goto(`/clients/${clientId}`);
    await expect(page.getByRole('heading', { name: 'Active Client' })).toBeVisible();

    const documentsTab = page.getByRole('button', { name: 'Documents' });
    await documentsTab.click();

    // Verify Hierarchy
    const panel = page.getByTestId('client-documents-panel');
    await expect(panel.getByText('Letters, reports and clinical documents created for this client.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Create Document' })).toBeVisible();

    // Drafts Section
    const draftsSection = page.getByRole('region', { name: 'Drafts' });
    await expect(draftsSection).toBeVisible();
    await expect(draftsSection.getByText('Draft Document')).toBeVisible();
    await expect(draftsSection.getByRole('button', { name: 'Continue editing' })).toBeVisible();

    // Finalised Section
    const finalisedSection = page.getByRole('region', { name: 'Finalised' });
    await expect(finalisedSection).toBeVisible();
    await expect(finalisedSection.getByText('Finalised Document')).toBeVisible();
    await expect(finalisedSection.getByRole('button', { name: 'Download' })).toBeVisible();
  });

  test('should restrict actions for archived client but preserve finalised access', async ({ page }) => {
    // Mock Archived Client
    await page.route('**/rest/v1/clients*', async (route) => {
      const isSingle = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json');
      const clientData = { id: clientId, user_id: 'mock-user-id', display_name: 'Archived Client', archived: true };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? clientData : [clientData]) });
    });

    // Mock Documents
    await page.route('**/rest/v1/documents*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockDraft, mockFinalised]) });
    });

    await page.goto(`/clients/${clientId}`);
    await expect(page.getByRole('heading', { name: 'Archived Client' })).toBeVisible();

    const documentsTab = page.getByRole('button', { name: 'Documents' });
    await documentsTab.click();

    // Verify Create Document is hidden in the panel
    const panel = page.getByTestId('client-documents-panel');
    await expect(panel.getByRole('button', { name: 'Create Document' })).toHaveCount(0);

    // Verify Drafts section is visible but Continue editing is hidden
    const draftsSection = page.getByRole('region', { name: 'Drafts' });
    await expect(draftsSection).toBeVisible();
    await expect(draftsSection.getByText('Draft Document')).toBeVisible();
    await expect(draftsSection.getByRole('button', { name: 'Continue editing' })).toHaveCount(0);

    // Verify Finalised section is visible and Download IS available
    const finalisedSection = page.getByRole('region', { name: 'Finalised' });
    await expect(finalisedSection).toBeVisible();
    await expect(finalisedSection.getByText('Finalised Document')).toBeVisible();
    await expect(finalisedSection.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});
