import { test, expect } from '@playwright/test'
const origin = 'http://127.0.0.1:5194'
const userId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const clientId = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fictional@example.invalid', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Fictional therapist' }, created_at: '2026-01-01T00:00:00Z' }
const client = { id: clientId, user_id: userId, display_name: 'Fictional document test client', current_focus: '', archived: false }
const sessions = [3, 2, 1].map(n => ({ id: id(n), client_id: clientId, user_id: userId, occurred_at: `2026-10-0${n}T10:00:00Z`, status: 'completed', version: 1 }))
const catalogue = sessions.map(s => ({ sessionId: s.id, occurredAt: s.occurred_at, reviewedAt: '2026-10-05T10:00:00Z', linkedTranscripts: [] }))

async function fixture(page) {
  const generated = [], unexpectedWrites = [], documents = []
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'document-test.supabase.co') {
      if (url.pathname === '/auth/v1/user') return json(user)
      const single = (request.headers().accept || '').includes('object+json')
      const table = url.pathname.split('/').pop()
      if (table === 'documents' && request.method() === 'POST') {
        const row = { ...request.postDataJSON(), id: id(80), version: 1, created_at: '2026-10-26T12:00:00Z', updated_at: '2026-10-26T12:00:00Z' }
        documents.push(row); return json(single ? row : [row])
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        unexpectedWrites.push(url.pathname)
        return route.fulfill({ status: 409, contentType: 'application/json', body: '{"message":"Unexpected test write blocked"}' })
      }
      if (table === 'clients') return json(single ? client : [client])
      if (table === 'profiles') return json(single ? { id: userId, full_name: 'Fictional therapist' } : [])
      if (table === 'sessions') return json(single ? sessions[0] : sessions)
      if (table === 'documents') return json(single ? documents[0] || null : documents)
      return json(single ? null : [])
    }
    if (url.origin === origin) {
      if (url.pathname === '/api/billing/status') return json({ hasWorkspaceAccess: true, subscription: null })
      if (url.pathname === '/api/ai/client-session-summary') {
        const body = request.postDataJSON()
        if (body.catalogue) return json({ success: true, data: { availableSessions: catalogue } })
        const selected = body.documentPurpose === 'recent_review' ? catalogue : catalogue.slice(0, 1)
        const sources = selected.map(s => ({ id: 'capture:' + s.sessionId, kind: 'session_capture', sessionId: s.sessionId,
          occurredAt: s.occurredAt, label: 'Reviewed Session Capture', url: `/clients/${clientId}/sessions/${s.sessionId}` }))
        const data = { ...body, sourceVersion: 'synthetic-source-hash', sources, sessionCount: selected.length, warnings: [] }
        if (body.preview) return json({ success: true, data })
        generated.push(body)
        return json({ success: true, data: { ...data, generationId: id(90 + generated.length), generatedAt: '2026-10-26T12:00:00Z',
          promptVersion: 'prepared-document/1.0.0', model: 'fictional-browser-fixture',
          draft: { body: `Working review ${generated.length}\n\nA fictional, source-linked observation for the ${body.lens} perspective. This is browser test data, not a clinical assessment.` },
          claims: [{ text: 'Fictional source-linked observation', evidenceStrength: 'current_observation', sourceIds: [sources[0].id] }] } })
      }
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method())) unexpectedWrites.push(url.pathname)
        return json({ connected: false, transcripts: [], events: [], appointments: [], data: [] })
      }
      return route.continue()
    }
    return route.abort()
  })
  const expires = Math.floor(Date.now() / 1000) + 3600
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const access = enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc({ sub: userId, exp: expires, role: 'authenticated' }) + '.fictional-signature'
  await page.addInitScript(({ user, access, expires }) => localStorage.setItem('sb-document-test-auth-token', JSON.stringify({ access_token: access, refresh_token: 'fictional-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expires, user })), { user, access, expires })
  return { generated, unexpectedWrites, documents }
}

for (const width of [1440, 390]) {
  test(`document preparation and editable draft round-trip at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    page.on('dialog', dialog => dialog.accept())
    const state = await fixture(page)
    await page.goto('/clients/' + clientId)
    await page.getByRole('button', { name: 'Review recent sessions', exact: true }).click()
    const composer = page.getByTestId('client-document-composer')
    await expect(composer).toBeVisible()
    await expect(composer.getByTestId('document-audience')).toHaveValue('therapist')
    await expect(composer.getByTestId('document-perspective').locator('option')).toHaveCount(4)
    await composer.getByTestId('document-perspective').selectOption('gentle_cbt')
    const generate = composer.getByTestId('generate-prepared-document')
    await expect(generate).toBeEnabled()
    await expect(composer.getByTestId('source-preview')).toContainText('3 session(s) selected')
    expect(await composer.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.screenshot({ path: `test-results/documents/preparation-${width}.png`, fullPage: true })
    await generate.click()
    const editor = composer.locator('.document-prosemirror')
    await expect(editor).toContainText('Working review 1')
    await expect(editor).toHaveAttribute('contenteditable', 'true')
    expect(state.generated).toHaveLength(1)
    expect(state.generated[0]).toMatchObject({ audience: 'therapist', lens: 'gentle_cbt', window: 'last_three', preparation: true })
    await editor.fill('Therapist-edited wording that must survive regeneration.')
    await composer.getByRole('button', { name: 'Change preparation', exact: true }).click()
    await composer.getByTestId('document-perspective').selectOption('transactional_analysis')
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(editor).toContainText('Working review 2')
    await composer.getByRole('button', { name: 'Restore previous version', exact: true }).click()
    await expect(editor).toHaveText('Therapist-edited wording that must survive regeneration.')
    await composer.getByRole('button', { name: 'Save Draft', exact: true }).click()
    await expect(composer).toContainText('to Client Documents')
    expect(state.documents).toHaveLength(1)
    expect(state.documents[0].document_type).toBe('clinical_summary')
    expect(state.documents[0].content.clinicalIntelligence.generation.audience).toBe('therapist')
    await composer.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Continue editing', exact: true }).click()
    await expect(page.getByTestId('client-document-composer').locator('.document-prosemirror')).toHaveText('Therapist-edited wording that must survive regeneration.')
    expect(state.unexpectedWrites).toEqual([])
  })
}
