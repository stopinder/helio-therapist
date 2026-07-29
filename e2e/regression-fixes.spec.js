import { test, expect } from '@playwright/test';

/**
 * Audit of Data Contracts & Response Shapes
 * 
 * 1. Auth:
 *    - GET /auth/v1/user -> Object { id, email, ... }
 * 
 * 2. Clients:
 *    - GET /rest/v1/clients?id=eq.X -> Object { id, display_name, user_id, ... } (via .single())
 *    - GET /rest/v1/clients?archived=eq.false -> Array<{ ... }>
 * 
 * 3. Sessions:
 *    - GET /rest/v1/sessions?id=eq.X&client_id=eq.Y -> Object { id, client_id, occurred_at, status, notes, ... } (via .single())
 *    - GET /rest/v1/sessions?client_id=eq.X&status=eq.in_progress -> Array of 0 or 1 (via .maybeSingle())
 * 
 * 4. Timeline:
 *    - GET /rest/v1/client_timeline_events?client_id=eq.X -> Array<{ id, event_type, occurred_at, ... }>
 * 
 * 5. Amendments:
 *    - GET /rest/v1/clinical_record_amendments?session_id=eq.X -> Array<{ id, sequence_number, reason, content, ... }>
 *    - RPC approve_clinical_record_amendment -> Object { id, ... } (presented via singleResult)
 */

// Supabase REST helper to handle .single() / .maybeSingle() vs .select()
const supabaseFulfill = async (route, data) => {
  const accept = route.request().headers()['accept'] || '';
  const isSingle = accept.includes('application/vnd.pgrst.object+json');
  
  let body;
  if (isSingle) {
    body = Array.isArray(data) ? data[0] : data;
  } else {
    body = Array.isArray(data) ? data : [data];
  }
  
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body || (isSingle ? null : []))
  });
};

const FIXTURES = {
  user: {
    id: 'therapist-123',
    email: 'therapist@example.com',
  },
  client: {
    id: 'client-456',
    user_id: 'therapist-123',
    display_name: 'Test Client',
    reference: 'CLIENT-1',
    archived: false,
    current_focus: 'Focus area',
    created_at: '2026-07-29T10:00:00Z',
    updated_at: '2026-07-29T10:00:00Z'
  },
  session: {
    id: 'session-789',
    client_id: 'client-456',
    user_id: 'therapist-123',
    status: 'completed',
    occurred_at: '2026-07-29T11:00:00Z',
    completed_at: '2026-07-29T12:00:00Z',
    notes: JSON.stringify({
      presentingConcerns: 'Initial presenting concerns',
      sessionThemes: 'Initial session themes',
      interventionsUsed: 'Initial interventions',
      clientResponse: 'Initial client response',
      riskSafeguarding: 'Initial risk assessment',
      progressGoals: 'Initial progress',
      planNextSession: 'Initial plan'
    }),
    workflow_status: 'approved',
    version: 1
  },
  timeline: [
    {
      id: 'event-1',
      event_type: 'session_completed',
      occurred_at: '2026-07-29T12:00:00Z',
      summary: 'Session completed',
      subject_type: 'session',
      subject_id: 'session-789',
      client_id: 'client-456'
    }
  ],
  amendments: [
    {
      id: 'amendment-1',
      session_id: 'session-789',
      user_id: 'therapist-123',
      approved_by: 'therapist-123',
      sequence_number: 1,
      reason: 'Incorrect detail',
      content: 'The client mentioned X, not Y.',
      approved_at: '2026-07-29T13:00:00Z',
      created_at: '2026-07-29T12:30:00Z'
    }
  ]
};

test.describe('Regression Fixes Coverage', () => {
  let currentAmendments;

  test.beforeEach(async ({ page }) => {
    currentAmendments = [...FIXTURES.amendments];

    // 1. Establish Authenticated Session
    const authSession = {
      access_token: 'fake-token',
      refresh_token: 'fake-refresh',
      user: {
        ...FIXTURES.user,
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Test Therapist' }
      },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    await page.addInitScript((s) => {
      window.localStorage.setItem('sb-epyvukpiupbkprkrouyo-auth-token', JSON.stringify(s));
    }, authSession);

    // 2. Mock Network Requests
    
    // Auth
    await page.route('**/auth/v1/user*', route => 
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authSession.user) })
    );
    await page.route('**/auth/v1/session*', route => 
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authSession) })
    );

    // Supabase REST helper to handle .single() / .maybeSingle() vs .select()
    // Helper moved to top level

    // Clients
    await page.route('**/rest/v1/clients*', async route => {
      const url = route.request().url();
      if (url.includes('id=eq.')) {
        await supabaseFulfill(route, FIXTURES.client);
      } else {
        await supabaseFulfill(route, [FIXTURES.client]);
      }
    });

    // Sessions
    await page.route('**/rest/v1/sessions*', async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'GET') {
        if (url.includes('status=eq.in_progress')) {
          // createOrResumeSession check. We return the completed session to force navigation to it.
          await supabaseFulfill(route, [FIXTURES.session]);
        } else {
          // getSession or listSessions
          await supabaseFulfill(route, FIXTURES.session);
        }
      } else {
        // INSERT/PATCH
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(FIXTURES.session)
        });
      }
    });

    // Timeline
    await page.route('**/rest/v1/client_timeline_events*', async route => {
      await supabaseFulfill(route, FIXTURES.timeline);
    });

    // Amendments
    await page.route('**/rest/v1/clinical_record_amendments*', async route => {
      await supabaseFulfill(route, currentAmendments);
    });

    // RPC: Amendment Approval
    await page.route('**/rest/v1/rpc/approve_clinical_record_amendment', async route => {
      const payload = route.request().postDataJSON();
      const newAmendment = {
        ...FIXTURES.amendments[0],
        id: 'amendment-new',
        sequence_number: currentAmendments.length + 1,
        reason: payload.p_reason,
        content: payload.p_content,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      currentAmendments.push(newAmendment);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newAmendment)
      });
    });
  });

  test('Client Timeline and Amendment Flow Regression', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    // 1. Open Client Workspace
    await page.goto(`/clients/${FIXTURES.client.id}`);
    
    // Early assertion: Workspace shell loaded
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: FIXTURES.client.display_name })).toBeVisible();

    // Verify Timeline
    await page.getByRole('button', { name: 'Timeline' }).click();
    await expect(page.getByText('Session completed', { exact: true })).toBeVisible();

    // Check for specific console regression errors
    for (const error of consoleErrors) {
      expect(error).not.toContain("Unexpected token 'i'");
      expect(error).not.toContain("Failed to resolve component: EmptyState");
    }

    // 2. Open Session Workspace
    await page.getByRole('button', { name: /Open Session Workspace/i }).click();
    await expect(page).toHaveURL(new RegExp(`/clients/${FIXTURES.client.id}/sessions/${FIXTURES.session.id}`));

    // Verify Header data
    await expect(page.getByRole('heading', { level: 1, name: FIXTURES.client.display_name })).toBeVisible();
    await expect(page.getByText(/July 29, 2026/)).toBeVisible(); // From occurred_at

    // 3. Clinical Summary Tab
    await page.getByRole('tab', { name: 'Clinical Summary' }).click();
    
    // Verify Approved/Read-only state
    await expect(page.getByText('This approved record is read-only.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 5, name: 'Presenting concerns' })).toBeVisible();
    await expect(page.getByText('Initial presenting concerns', { exact: true })).toBeVisible();

    // 4. Record History (already visible inline in this version)
    await expect(page.getByRole('heading', { level: 4, name: 'Record History' })).toBeVisible();
    await expect(page.getByText('Amendment 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Incorrect detail', { exact: true })).toBeVisible();

    // 5. Safeguard: Amendment draft does not call save_session_draft
    let saveSessionDraftCalled = false;
    await page.route('**/rest/v1/rpc/save_session_draft', () => {
      saveSessionDraftCalled = true;
    });

    await page.getByRole('button', { name: /Create Record Amendment/i }).click();
    await page.getByLabel('Amendment Reason').fill('New amendment reason');
    await page.getByLabel('Amendment Content').fill('New amendment content');
    
    // Ensure no accidental save RPC
    expect(saveSessionDraftCalled).toBe(false);

    // 6. Amendment Approval
    await page.getByRole('button', { name: 'Mark Amendment Ready for Review' }).click();
    await page.getByLabel('I have reviewed this amendment and confirm it should be appended to the clinical record.').check();

    await page.getByRole('button', { name: 'Approve Amendment' }).click();

    // 7. Verify History & Persistence
    await expect(page.getByRole('heading', { name: 'Record Amendment 2' })).toBeVisible();
    await expect(page.getByText('New amendment reason', { exact: true })).toBeVisible();
    
    // Verify it also appears in the Record History section at the bottom
    await expect(page.getByRole('heading', { name: 'Record History' })).toBeVisible();
    await expect(page.getByText('Amendment 2', { exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: 'Clinical Summary' }).click();
    await expect(page.getByText('Amendment 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Amendment 2', { exact: true })).toBeVisible();
  });
});
