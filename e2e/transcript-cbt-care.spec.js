import { test, expect } from '@playwright/test';

test.describe('Transcript CBT Care handoff', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const transcriptId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const email = 'therapist@example.com';
  const password = 'password123';

  function base64Url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
  const now = Math.floor(Date.now() / 1000);
  const mockToken = [base64Url({ alg:'HS256', typ:'JWT' }), base64Url({ aud:'authenticated', exp:now+3600, iat:now, sub:userId, email, role:'authenticated' }), 'playwright-signature'].join('.');

  test('requires therapist review and explicit save before persisting transcript-derived CBT Care', async ({ page }) => {
    let generated = false;
    let careInsert = null;

    await page.route('**/auth/v1/token*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ access_token:mockToken, refresh_token:'mock-refresh-token', token_type:'bearer', expires_in:3600, user:{ id:userId, email, role:'authenticated', aud:'authenticated', user_metadata:{ full_name:'Test Therapist' } } }) }));
    await page.route('**/auth/v1/user', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ id:userId, email, user_metadata:{ full_name:'Test Therapist' } }) }));

    await page.route('**/api/zoom/transcripts*', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ transcripts:[{ id:transcriptId, text:'Client described avoiding a feared situation and noticing an anxious prediction before choosing a small approach step.', requestedLens:'cbt', clientId, sessionRef:sessionId }] }) }));
    await page.route('**/api/ai/transcript-cbt-care-suggestions', route => {
      generated = true;
      expect(route.request().postDataJSON()).toEqual({ transcriptId });
      return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ success:true, data:{ clientId, sessionId, lensId:'gentle_cbt', suggestions:[{ id:'suggestion-1', kind:'trying', body:'Consider collaboratively testing the anxious prediction with a small, agreed behavioural experiment.', basis:'session_transcript', epistemic:'possible_next_step', action:'add', targetItemId:null, reason:'The transcript describes avoidance, a prediction, and an initial approach step.', promptVersion:'transcript-cbt-care-v1' }] } }) });
    });

    await page.route('**/rest/v1/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const table = url.pathname.split('/').pop();
      const json = body => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(body) });

      if (table === 'profiles') return json({ id:userId, full_name:'Test Therapist', role:'therapist' });
      if (table === 'therapist_reminders') return json([]);
      if (table === 'clients') {
        if (url.searchParams.get('id') === `eq.${clientId}`) return json({ id:clientId, user_id:userId, display_name:'Test Client', reference:'test-ref', current_focus:'Test focus', archived:false, created_at:'2026-01-01T00:00:00Z', updated_at:'2026-01-01T00:00:00Z' });
        return json([]);
      }
      if (table === 'sessions') {
        if (url.searchParams.get('id') === `eq.${sessionId}`) return json({ id:sessionId, user_id:userId, client_id:clientId, occurred_at:'2026-08-12T10:00:00.000Z', status:'in_progress', workflow_status:'review_choices_saved', notes:'', notes_status:'draft', version:1, created_at:'2026-08-12T10:00:00Z', updated_at:'2026-08-12T10:00:00Z' });
        return json([]);
      }
      if (table === 'client_care_items') {
        if (request.method() === 'POST') {
          careInsert = request.postDataJSON();
          return json({ id:'ffffffff-ffff-4fff-8fff-ffffffffffff', ...careInsert, status:'current', created_at:'2026-08-16T20:00:00Z', updated_at:'2026-08-16T20:00:00Z' });
        }
        return json([]);
      }
      return json([]);
    });

    await page.goto(`/clients/${clientId}/sessions/${sessionId}`, { waitUntil:'domcontentloaded' });
    const loginEmail = page.getByLabel('Email address');
    const workspaceShell = page.getByTestId('workspace-shell');
    await expect(loginEmail.or(workspaceShell)).toBeVisible({ timeout:15000 });
    if (await loginEmail.isVisible()) {
      await loginEmail.fill(email);
      await page.getByLabel('Password').fill(password);
      await page.locator('form').getByRole('button', { name:'Sign in' }).click();
    }

    await expect(page.getByText('CBT reflection requested')).toBeVisible({ timeout:15000 });
    await page.getByRole('button', { name:'Prepare CBT Care suggestions' }).click();
    await expect.poll(() => generated).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}\\?tab=Care`));

    await expect(page.getByText('Session transcript · AI-assisted · not saved')).toBeVisible({ timeout:15000 });
    await expect(page.getByText('Consider collaboratively testing the anxious prediction with a small, agreed behavioural experiment.')).toBeVisible();
    await expect(page.getByText('From session transcript')).toBeVisible();
    expect(careInsert).toBeNull();

    await page.getByRole('button', { name:'Accept' }).click();
    expect(careInsert).toBeNull();
    await page.getByRole('button', { name:'Save 1 accepted change' }).click();
    await expect.poll(() => careInsert).not.toBeNull();
    expect(careInsert).toMatchObject({ client_id:clientId, kind:'trying', origin:'ai_assisted', provenance_session_id:sessionId, ai_prompt_version:'transcript-cbt-care-v1' });
  });
});
