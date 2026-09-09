import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const userId = '11111111-1111-4111-8111-111111111111'
const email = 'therapist@example.com'
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const timestamp = Math.floor(Date.now() / 1000)
const token = [encode({ alg: 'HS256', typ: 'JWT' }), encode({ aud: 'authenticated', exp: timestamp + 3600, iat: timestamp, sub: userId, email, role: 'authenticated' }), 'synthetic-signature'].join('.')

async function prepare(page) {
  const state = { records: [], inserts: [], forbidden: [], failNextSave: false }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (local && !url.pathname.startsWith('/api/')) return route.continue()
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/api/ai/') || url.pathname === '/api/therapist-report') {
      state.forbidden.push(url.pathname); return send({ error: 'No AI in native library test' }, 503)
    }
    if (url.pathname.startsWith('/api/')) return send({ connected: false, success: true, data: [], reminders: [] })
    // Every auth/database response is intercepted; no real service or account is used.
    if (url.pathname.startsWith('/auth/v1/token')) return send({ access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user: { id: userId, email, aud: 'authenticated', role: 'authenticated' } })
    if (url.pathname === '/auth/v1/user') return send({ id: userId, email, role: 'authenticated' })
    if (url.pathname.startsWith('/rest/v1/profiles')) return send({ id: userId, role: 'therapist', full_name: 'Test Therapist' })
    if (url.pathname === '/rest/v1/private_reflections') {
      if (request.method() === 'POST') {
        const row = request.postDataJSON(); state.inserts.push(row)
        if (state.failNextSave) { state.failNextSave = false; return send({ message: 'Synthetic save failure', code: 'test_failure' }, 503) }
        if (state.records.some(r => r.id === row.id)) return send({ message: 'duplicate key', code: '23505' }, 409)
        const saved = { ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), clients: null }
        state.records.unshift(saved); return send(saved, 201)
      }
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      const owned = state.records.filter(r => r.user_id === userId && (!id || r.id === id))
      return send(id && request.headers().accept?.includes('object') ? owned[0] || null : owned)
    }
    if (url.pathname.startsWith('/rest/v1/')) return send([])
    return route.abort() // External fonts/analytics cannot escape this synthetic test.
  })
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-only')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await page.goto('/supervision/reflections')
  await page.getByRole('link', { name: 'Reflect on your therapeutic stance' }).click()
  await expect(page.getByRole('heading', { name: 'Your therapeutic stance', exact: true })).toBeVisible()
  return state
}
async function complete(page, value = 'a') {
  await page.locator('.cpd-reflection').getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Begin reflection', exact: true }).click()
  for (let i = 1; i <= 15; i++) {
    const id = `q${String(i).padStart(2, '0')}`
    await page.locator(`input[name="${id}"][value="${value}"]`).locator('..').click()
    await expect(page.getByTestId('answered-count')).toHaveText(`${i} answered`)
    if (i < 15) {
      const next = `q${String(i + 1).padStart(2, '0')}`
      await page.waitForFunction(id => {
        const question = document.querySelector(`[data-question="${id}"]`)
        const header = document.querySelector('[data-testid="progress-header"]')
        if (!question || !header) return false
        const q = question.getBoundingClientRect(), h = header.getBoundingClientRect()
        return getComputedStyle(header).position === 'sticky' && h.top >= 0 && h.bottom < innerHeight && q.top >= h.bottom - 1 && q.top <= h.bottom + 36
      }, next)
    }
  }
  await page.getByTestId('continue-button').click()
  await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
  await expect(page.locator('.report-section')).toHaveCount(9)
  await expect(page.getByRole('button', { name: 'Save to my reflection library', exact: true })).toBeEnabled()
}

test('native exercise: sticky auto-scroll, exact text save, retry, library readback and source boundary', async ({ page }) => {
  test.setTimeout(120000)
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  const state = await prepare(page)
  await complete(page)
  const filePromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save reflection as text', exact: true }).click()
  const file = await filePromise
  const text = await readFile(await file.path(), 'utf8')
  expect(state.inserts).toHaveLength(0)
  state.failNextSave = true
  await page.getByRole('button', { name: 'Save to my reflection library', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('save was not confirmed')
  await expect(page.getByRole('button', { name: 'Save reflection as text', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save to my reflection library', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved to my reflection library', exact: true })).toBeDisabled()
  expect(state.records).toHaveLength(1)
  expect(state.inserts[0].id).toBe(state.inserts[1].id)
  expect(state.records[0].body).toBe(text)
  expect(state.records[0].user_id).toBe(userId)
  expect(state.records[0].client_id).toBeNull()
  expect(state.records[0].session_ref).toBeNull()
  expect(state.records[0].included_in_supervision).toBe(false)
  expect(state.records[0].workspace_content.stanceSnapshot.continuity.status).toBe('not_analysed')
  expect(state.records[0].workspace_content.reflectiveMap).toBeUndefined()
  await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
  await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved to my reflection library', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'View my reflection library', exact: true }).click()
  await expect(page).toHaveURL(/\/supervision\/reflections$/)
  await expect(page.getByTestId('pd-timeline-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'Reflection actions', exact: true }).click()
  await page.getByRole('button', { name: 'View Full Detail', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('saved-exercise-text')).toHaveText(text)
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Reflect with AI', exact: true })).toHaveCount(0)
  expect(state.forbidden).toEqual([])
  expect(errors).toEqual([])
})

test('mobile context choices complete and library save does not invent a tendency', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const state = await prepare(page)
  await complete(page, 'context')
  await page.getByRole('button', { name: 'Save to my reflection library', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved to my reflection library', exact: true })).toBeDisabled()
  expect(state.records[0].workspace_content.stanceSnapshot.interpretation.primaryDimensions).toEqual([])
  expect(state.forbidden).toEqual([])
})
