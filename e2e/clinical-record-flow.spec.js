import { test, expect } from '@playwright/test';

test.describe('Clinical Record approval and amendment flow', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const amendmentId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const email = 'therapist@example.com';
  const password = 'password123';

  function base64Url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
  const now = Math.floor(Date.now() / 1000);
  const mockToken = [base64Url({ alg:'HS256', typ:'JWT' }), base64Url({ aud:'authenticated', exp:now+3600, iat:now, sub:userId, email, role:'authenticated' }), 'playwright-signature'].join('.');

  let sessionRow;
  let amendments;
  let transcribeCalls;

  test.beforeEach(async ({ page }) => {
    sessionRow = { id:sessionId, client_id:clientId, occurred_at:'2026-08-12T10:00:00.000Z', status:'in_progress', workflow_status:'no_further_action', notes:'', notes_status:'draft', version:1, completed_at:null, ended_at:null, created_at:'2026-08-12T10:00:00Z', updated_at:'2026-08-12T10:00:00Z', legacy_ref:null, zoom_state:null, zoom_meeting_id:null, zoom_error:'' };
    amendments = [];
    transcribeCalls = 0;

    await page.addInitScript(() => {
      const track = { stop() {} };
      Object.defineProperty(navigator, 'mediaDevices', { configurable:true, value:{ getUserMedia: async () => ({ getTracks:() => [track] }) } });
      class MockMediaRecorder {
        constructor() { this.state='inactive'; this.mimeType='audio/webm'; this.ondataavailable=null; this.onstop=null; }
        start() { this.state='recording'; }
        stop() { this.state='inactive'; this.ondataavailable?.({ data:new Blob(['mock-audio'], { type:'audio/webm' }) }); this.onstop?.(); }
      }
      window.MediaRecorder = MockMediaRecorder;
    });

    await page.route('**/auth/v1/token*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ access_token:mockToken, refresh_token:'mock-refresh-token', token_type:'bearer', expires_in:3600, user:{ id:userId, email, role:'authenticated', aud:'authenticated', user_metadata:{ full_name:'Test Therapist' } } }) }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, email, user_metadata:{ full_name:'Test Therapist' } }) }));
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, full_name:'Test Therapist', role:'therapist' }) }));
    await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify([]) }));
    await page.route('**/rest/v1/clients*', route => { const url=new URL(route.request().url()); if(url.searchParams.get('id')===`eq.${clientId}`) return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:clientId, user_id:userId, display_name:'Test Client', reference:'test-ref', current_focus:'Test focus', archived:false, created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z' }) }); return route.continue(); });
    await page.route('**/rest/v1/sessions*', route => { const url=new URL(route.request().url()); if(url.searchParams.get('id')===`eq.${sessionId}`) return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(sessionRow) }); if(url.searchParams.get('client_id')===`eq.${clientId}`) return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify([sessionRow]) }); return route.continue(); });
    await page.route('**/rest/v1/appointments*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify([]) }));
    await page.route('**/rest/v1/rpc/save_session_draft', async route => { const body=route.request().postDataJSON(); sessionRow={ ...sessionRow, notes:body.p_notes, version:sessionRow.version+1, updated_at:'2026-08-12T10:05:00Z' }; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(sessionRow) }); });
    await page.route('**/rest/v1/rpc/complete_session', async route => { const body=route.request().postDataJSON(); sessionRow={ ...sessionRow, notes:body.p_notes, status:'completed', notes_status:'approved', workflow_status:'approved', completed_at:'2026-08-12T10:10:00Z', ended_at:'2026-08-12T10:10:00Z', version:sessionRow.version+1, updated_at:'2026-08-12T10:10:00Z' }; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(sessionRow) }); });
    await page.route('**/rest/v1/clinical_record_amendments*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(amendments) }));
    await page.route('**/rest/v1/rpc/approve_clinical_record_amendment', async route => { const body=route.request().postDataJSON(); const amendment={ id:amendmentId, session_id:sessionId, sequence_number:1, reason:body.p_reason, content:body.p_content, approved_at:'2026-08-12T10:15:00Z', approved_by:userId }; amendments=[amendment]; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(amendment) }); });
    await page.route('**/api/ai/transcribe', async route => { transcribeCalls += 1; const body=route.request().postDataJSON(); expect(body.audio).toMatch(/^data:audio\/webm;base64,/); const text=transcribeCalls===1?'Factual correction dictated.':'Client reported four hours of sleep, not five, dictated.'; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ text }) }); });
    await page.route('**/api/client-timeline*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ events:sessionRow.status==='completed'?[{ id:'ffffffff-ffff-4fff-8fff-ffffffffffff', event_type:'session_completed', subject_type:'session', subject_id:sessionId, session_id:sessionId, occurred_at:sessionRow.completed_at, summary:'Clinical record approved for this session.' }]:[] }) }));
    await page.route('**/api/documents*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ documents:[] }) }));
    await page.route('**/api/zoom/transcripts*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ transcripts:[] }) }));
  });

  async function openWorkspace(page) {
    await page.goto(`/clients/${clientId}/sessions/${sessionId}`, { waitUntil:'domcontentloaded' });
    const loginEmail=page.getByLabel('Email address'), workspaceShell=page.getByTestId('workspace-shell');
    await expect(loginEmail.or(workspaceShell)).toBeVisible({ timeout:15000 });
    if(await loginEmail.isVisible()) { await loginEmail.fill(email); await page.getByLabel('Password').fill(password); await page.locator('form').getByRole('button',{name:'Sign in'}).click(); }
    await expect(workspaceShell).toBeVisible({ timeout:15000 });
  }

  test('approves a draft, dictates and approves an amendment, then reopens the immutable record from the client timeline', async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole('button',{name:/Clinical Record/}).click();
    await page.getByRole('button',{name:/Prepare Empty Clinical Summary Draft/i}).click();
    await page.getByLabel('Presenting concerns').fill('Client described increased work stress.');
    await page.getByLabel('Plan for next session').fill('Review coping strategies and sleep routine.');
    await page.getByRole('button',{name:'Mark Ready for Review'}).click();
    await page.getByLabel('I have reviewed this summary.').check();
    await page.getByRole('button',{name:'Approve Clinical Record'}).click();
    const approvalDialog=page.getByRole('dialog',{name:'Create Clinical Record'});
    await expect(approvalDialog).toBeVisible();
    await approvalDialog.getByLabel('I confirm that this summary accurately represents the session.').check();
    await approvalDialog.getByRole('button',{name:'Approve and Create Clinical Record'}).click();

    const completedRecord=page.getByTestId('completed-clinical-record');
    await expect(completedRecord).toBeVisible();
    await expect(completedRecord.getByText('This approved record is read-only. Corrections must be added through an amendment.')).toBeVisible();
    await expect(completedRecord.getByText('Client described increased work stress.')).toBeVisible();
    await expect(completedRecord.locator('textarea')).toHaveCount(0);

    await completedRecord.getByRole('button',{name:'Create Record Amendment'}).click();
    const editor=page.getByTestId('clinical-record-amendment-editor');
    const dictateButtons=editor.getByRole('button',{name:'Dictate'});
    await expect(dictateButtons).toHaveCount(2);

    await dictateButtons.nth(0).click();
    await expect(editor.getByRole('button',{name:'Stop recording'})).toBeVisible();
    await expect(editor.getByRole('button',{name:'Approve Amendment'})).toBeDisabled();
    await editor.getByRole('button',{name:'Stop recording'}).click();
    await expect(editor.getByLabel('Amendment Reason')).toHaveValue('Factual correction dictated.');

    await editor.getByLabel('Amendment Reason').fill('Factual correction');
    await editor.getByRole('button',{name:'Dictate'}).nth(1).click();
    await editor.getByRole('button',{name:'Stop recording'}).click();
    await expect(editor.getByLabel('Amendment Content')).toHaveValue('Client reported four hours of sleep, not five, dictated.');
    await editor.getByLabel('Amendment Content').fill('Client reported four hours of sleep, not five.');
    expect(transcribeCalls).toBe(2);

    await editor.getByLabel('I have reviewed this amendment and confirm it should be appended to the clinical record.').check();
    await editor.getByRole('button',{name:'Approve Amendment'}).click();
    await expect(editor).toBeHidden();
    await expect(completedRecord.getByText('Record Amendment 1')).toBeVisible();
    await expect(completedRecord.getByText('Factual correction',{exact:true})).toBeVisible();
    await expect(completedRecord.getByText('Client reported four hours of sleep, not five.')).toBeVisible();
    await expect(completedRecord.getByText('Client described increased work stress.')).toBeVisible();

    await page.getByRole('link',{name:'Client Workspace'}).click();
    await expect(page).toHaveURL(`/clients/${clientId}`);
    await page.getByRole('button',{name:'Timeline'}).click();
    await expect(page.getByText('Clinical record approved for this session.')).toBeVisible();
    await page.getByText('Clinical record approved for this session.').click();
    await expect(page).toHaveURL(`/clients/${clientId}/sessions/${sessionId}`);
    await page.getByRole('button',{name:/Clinical Record/}).click();
    const reopenedRecord=page.getByTestId('completed-clinical-record');
    await expect(reopenedRecord).toBeVisible();
    await expect(reopenedRecord.getByText('This approved record is read-only. Corrections must be added through an amendment.')).toBeVisible();
    await expect(reopenedRecord.getByText('Client described increased work stress.')).toBeVisible();
    await expect(reopenedRecord.getByText('Record Amendment 1')).toBeVisible();
    await expect(reopenedRecord.getByText('Client reported four hours of sleep, not five.')).toBeVisible();
    await expect(reopenedRecord.locator('textarea')).toHaveCount(0);
  });
});
