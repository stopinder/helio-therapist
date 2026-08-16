import { test, expect } from '@playwright/test';

test.describe('Clinical Record approval and amendment flow', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const amendmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const email = 'therapist@example.com';
  const password = 'password123';

  function base64Url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  const now = Math.floor(Date.now() / 1000);
  const mockToken = [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({ aud: 'authenticated', exp: now + 3600, iat: now, sub: userId, email, role: 'authenticated' }),
    'playwright-signature'
  ].join('.');

  let sessionRow;
  let amendments;

  test.beforeEach(async ({ page }) => {
    sessionRow = {
      id: sessionId,
      client_id: clientId,
      occurred_at: '2026-08-12T10:00:00.000Z',
      status: 'in_progress',
      workflow_status: 'no_further_action',
      notes: '',
      notes_status: 'draft',
      version: 1,
      completed_at: null,
      ended_at: null,
      created_at: '2026-08-12T10:00:00Z',
      updated_at: '2026-08-12T10:00:00Z',
      legacy_ref: null,
      zoom_state: null,
      zoom_meeting_id: null,
      zoom_error: ''
    };
    amendments = [];

    await page.route('**/auth/v1/token*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: mockToken, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: userId, email, role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Test Therapist' } } })
    }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, email, user_metadata: { full_name: 'Test Therapist' } }) }));
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, full_name: 'Test Therapist', role: 'therapist' }) }));
    await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.route('**/rest/v1/clients*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${clientId}`) return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: clientId, user_id: userId, display_name: 'Test Client', reference: 'test-ref', current_focus: 'Test focus', archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
      });
      return route.continue();
    });

    await page.route('**/rest/v1/sessions*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('id') === `eq.${sessionId}`) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionRow) });
      return route.continue();
    });

    await page.route('**/rest/v1/rpc/save_session_draft', async route => {
      const body = route.request().postDataJSON();
      sessionRow = { ...sessionRow, notes: body.p_notes, version: sessionRow.version + 1, updated_at: '2026-08-12T10:05:00Z' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionRow) });
    });

    await page.route('**/rest/v1/rpc/complete_session', async route => {
      const body = route.request().postDataJSON();
      sessionRow = {
        ...sessionRow,
        notes: body.p_notes,
        status: 'completed',
        notes_status: 'approved',
        completed_at: '2026-08-12T10:10:00Z',
        ended_at: '2026-08-12T10:10:00Z',
        version: sessionRow.version + 1,
        updated_at: '2026-08-12T10:10:00Z'
      };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionRow) });
    });

    await page.route('**/rest/v1/clinical_record_amendments*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(amendments) }));

    await page.route('**/rest/v1/rpc/approve_clinical_record_amendment', async route => {
      const body = route.request().postDataJSON();
      const amendment = {
        id: amendmentId,
        session_id: sessionId,
        sequence_number: 1,
        reason: body.p_reason,
        content: body.p_content,
        approved_at: '2026-08-12T10:15:00Z',
        approved_by: userId
      };
      amendments = [amendment];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(amendment) });
    });

    await page.route('**/api/zoom/transcripts*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [] }) }));
  });

  async function openWorkspace(page) {
    await page.goto(`/clients/${clientId}/sessions/${sessionId}`, { waitUntil: 'domcontentloaded' });
    const loginEmail = page.getByLabel('Email address');
    const workspaceShell = page.getByTestId('workspace-shell');
    await expect(loginEmail.or(workspaceShell)).toBeVisible({ timeout: 15000 });
    if (await loginEmail.isVisible()) {
      await loginEmail.fill(email);
      await page.getByLabel('Password').fill(password);
      await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    }
    await expect(workspaceShell).toBeVisible({ timeout: 15000 });
  }

  test('approves a draft into a read-only clinical record and appends an amendment', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button', { name: /Clinical Record/ }).click();
    await page.getByRole('button', { name: /Prepare Empty Clinical Summary Draft/i }).click();

    await page.getByLabel('Presenting concerns').fill('Client described increased work stress.');
    await page.getByLabel('Plan for next session').fill('Review coping strategies and sleep routine.');
    await page.getByRole('button', { name: 'Mark Ready for Review' }).click();
    await page.getByLabel('I have reviewed this summary.').check();
    await page.getByRole('button', { name: 'Approve Clinical Record' }).click();

    const approvalDialog = page.getByRole('dialog', { name: 'Create Clinical Record' });
    await expect(approvalDialog).toBeVisible();
    await approvalDialog.getByLabel('I confirm that this summary accurately represents the session.').check();
    await approvalDialog.getByRole('button', { name: 'Approve and Create Clinical Record' }).click();

    const completedRecord = page.getByTestId('completed-clinical-record');
    await expect(completedRecord).toBeVisible();
    await expect(completedRecord.getByText('This approved record is read-only. Corrections must be added through an amendment.')).toBeVisible();
    await expect(completedRecord.getByText('Client described increased work stress.')).toBeVisible();
    await expect(completedRecord.locator('textarea')).toHaveCount(0);

    await completedRecord.getByRole('button', { name: 'Create Record Amendment' }).click();
    const editor = page.getByTestId('clinical-record-amendment-editor');
    await editor.getByLabel('Amendment Reason').fill('Factual correction');
    await editor.getByLabel('Amendment Content').fill('Client reported four hours of sleep, not five.');
    await editor.getByLabel('I have reviewed this amendment and confirm it should be appended to the clinical record.').check();
    await editor.getByRole('button', { name: 'Approve Amendment' }).click();

    await expect(editor).toBeHidden();
    await expect(completedRecord.getByText('Record Amendment 1')).toBeVisible();
    await expect(completedRecord.getByText('Factual correction')).toBeVisible();
    await expect(completedRecord.getByText('Client reported four hours of sleep, not five.')).toBeVisible();
    await expect(completedRecord.getByText('Client described increased work stress.')).toBeVisible();
  });
});
