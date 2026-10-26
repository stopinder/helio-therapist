import { test, expect } from '@playwright/test'
const origin = 'http://127.0.0.1:5194'
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const userId = id(90), clientId = id(99)
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fictional@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const client = { id: clientId, user_id: userId, display_name: 'Fictional formulation test', archived: false }
const sessions = [3, 2, 1].map(n => ({ id: id(n), client_id: clientId, user_id: userId, occurred_at: `2026-10-0${n}T10:00:00Z`, status: 'in_progress', version: 1 }))
async function fixture(page) {
  const generated = [], documents = [], unexpectedWrites = []
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
    if (url.hostname === 'document-test.supabase.co') {
      if (url.pathname === '/auth/v1/user') return json(user)
      const table = url.pathname.split('/').pop(), single = (request.headers().accept || '').includes('object+json')
      if (table === 'documents' && request.method() === 'POST') {
        const row = { ...request.postDataJSON(), id: id(70 + documents.length), version: 1, created_at: '2026-10-26T12:00:00Z', updated_at: '2026-10-26T12:00:00Z' }
        documents.push(row); return json(single ? row : [row])
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { unexpectedWrites.push(url.pathname); return route.fulfill({ status: 409, body: '{}' }) }
      if (table === 'clients') return json(single ? client : [client])
      if (table === 'sessions') return json(single ? sessions[0] : sessions)
      if (table === 'profiles') return json(single ? { id: userId, full_name: 'Fictional therapist' } : [])
      if (table === 'documents') return json(single ? documents[0] || null : documents)
      return json(single ? null : [])
    }
    if (url.origin !== origin) return route.abort()
    if (url.pathname === '/api/billing/status') return json({ hasWorkspaceAccess: true, subscription: null })
    if (url.pathname === '/api/ai/client-session-summary') {
      const body = request.postDataJSON()
      const catalogue = sessions.map(s => ({ sessionId: s.id, occurredAt: s.occurred_at, reviewedAt: '2026-10-05T10:00:00Z', linkedTranscripts: [] }))
      if (body.catalogue) return json({ success: true, data: { availableSessions: catalogue } })
      const selected = body.window === 'current' ? catalogue.slice(0, 1) : catalogue
      const sources = selected.map(s => ({ id: 'capture:' + s.sessionId, kind: 'session_capture', sessionId: s.sessionId, occurredAt: s.occurredAt, label: 'Reviewed Session Capture', url: `/clients/${clientId}/sessions/${s.sessionId}` }))
      const data = { ...body, sources, sourceVersion: 'fictional-hash', sessionCount: selected.length, selectedSessionIds: selected.map(s => s.sessionId), anchorSessionId: selected[0].sessionId, warnings: [] }
      if (body.preview) return json({ success: true, data })
      generated.push(body)
      const internal = body.documentPurpose === 'working_formulation'
      return json({ success: true, data: { ...data, generationId: id(50 + generated.length), generatedAt: '2026-10-26T12:00:00Z',
        promptVersion: 'prepared-document/2.0.0', model: 'fictional-browser-fixture',
        draft: { body: internal ? 'Therapist working formulation - provisional, not a diagnosis\n\nRecorded material\nA fictional observation.\n\nProvisional understanding\nWorking interpretation: PRIVATE HYPOTHESIS.\n\nWhat remains uncertain\nThis is synthetic test data.' : 'A separately generated client summary from reviewed sessions.' }, claims: [] } })
    }
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(request.method())) unexpectedWrites.push(url.pathname)
      return json({ connected: false, transcripts: [], events: [], appointments: [], data: [] })
    }
    return route.continue()
  })
  const expires = Math.floor(Date.now() / 1000) + 3600, enc = v => Buffer.from(JSON.stringify(v)).toString('base64url')
  const access = enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc({ sub: userId, exp: expires, role: 'authenticated' }) + '.fictional'
  await page.addInitScript(({ user, access, expires }) => localStorage.setItem('sb-document-test-auth-token', JSON.stringify({ access_token: access, refresh_token: 'fictional', token_type: 'bearer', expires_in: 3600, expires_at: expires, user })), { user, access, expires })
  return { generated, documents, unexpectedWrites }
}
for (const width of [1440, 390]) {
  test(`formulations stay in the session and client summaries remain separate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    page.on('dialog', dialog => dialog.accept())
    const state = await fixture(page)
    const sessionUrl = '/clients/' + clientId + '/sessions/' + id(3)
    await page.goto(sessionUrl)
    await page.getByRole('button', { name: 'Summary options', exact: true }).click()
    const work = page.getByTestId('inline-document-workbench')
    await expect(work).toBeVisible()
    await expect(page).toHaveURL(origin + sessionUrl)
    await expect(page.getByTestId('client-document-composer')).toHaveCount(0)
    await expect(work.locator('select:visible')).toHaveCount(2)
    await expect(work.getByTestId('document-audience')).not.toBeVisible()
    await work.getByTestId('document-purpose').selectOption('working_formulation')
    await work.getByTestId('document-perspective').selectOption('gentle_cbt')
    const generate = work.getByTestId('generate-prepared-document')
    await expect(generate).toBeEnabled()
    await expect(work.getByTestId('preparation-overview')).toContainText('Therapist working document')
    expect(await work.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.screenshot({ path: `test-results/documents/formulation-inline-${width}.png`, fullPage: true })
    await generate.click()
    const text = work.getByTestId('inline-draft-text')
    await expect(text).toHaveValue(/provisional, not a diagnosis/)
    await text.fill('PRIVATE EDIT - keep the original internal formulation.')
    await work.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(work).toContainText('Saved to Client Documents')
    expect(state.documents[0].document_type).toBe('clinical_summary')
    await work.getByRole('button', { name: 'Prepare a separate client summary', exact: true }).click()
    await expect(work.getByTestId('inline-draft-text')).toHaveCount(0)
    await expect(generate).toBeEnabled()
    await generate.click()
    await expect(work.getByTestId('inline-draft-text')).toHaveValue('A separately generated client summary from reviewed sessions.')
    const clientRequest = state.generated.at(-1)
    expect(clientRequest).toMatchObject({ audience: 'client', includeCare: false, therapistGuidance: '', selectedSessionIds: [id(3), id(2), id(1)] })
    expect(JSON.stringify(clientRequest)).not.toContain('PRIVATE')
    await work.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(work).toContainText('Saved to Client Documents')
    expect(state.documents).toHaveLength(2)
    expect(state.documents[0].content.body).toContain('PRIVATE EDIT')
    expect(state.documents[1].content.body).not.toContain('PRIVATE')
    await work.getByRole('button', { name: 'Back to internal formulation', exact: true }).click()
    await expect(work.getByTestId('inline-draft-text')).toHaveValue('PRIVATE EDIT - keep the original internal formulation.')
    await work.getByRole('button', { name: 'Close options', exact: true }).click()
    await expect(work).toHaveCount(0)
    await expect(page).toHaveURL(origin + sessionUrl)
    expect(state.unexpectedWrites).toEqual([])
  })
}
