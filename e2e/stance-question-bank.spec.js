import { test, expect } from '@playwright/test'
import { buildResult, buildFallbackReport } from '../src/quiz/therapist/buildResult.js'
import { createReflectionSnapshot } from '../src/quiz/therapist/snapshot.js'
import { therapistQuestions, BANK_VERSION } from '../src/quiz/therapist/questions.js'

const userId = '00000000-0000-4000-8000-000000000001'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fictional@example.invalid', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Fictional therapist' }, created_at: '2026-01-01T00:00:00Z' }
const legacyAnswers = Object.fromEntries(therapistQuestions.map(q => [q.id, 'a']))
const legacy = createReflectionSnapshot({ id: '00000000-0000-4000-8000-000000000002', completedAt: '2026-09-01T12:00:00.000Z',
  answers: legacyAnswers, mode: 'fallback', report: buildFallbackReport(buildResult(legacyAnswers)) })

async function mockWorkspace(page, { savedHistory = false, ai = false, historyError = false } = {}) {
  const writes = [], aiRequests = [], remoteRequests = [], saved = []
  const rows = savedHistory ? [{ id: legacy.id, user_id: userId, created_at: legacy.completedAt, workspace_content: { captureSource: 'practice_reflection', practiceReflection: legacy } }] : []
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'stance-test.supabase.co') {
      if (url.pathname === '/auth/v1/user') return json(user)
      const single = (request.headers().accept || '').includes('object+json')
      const table = url.pathname.split('/').pop()
      if (table === 'private_reflections') {
        if (request.method() === 'POST') {
          const payload = request.postDataJSON()
          const row = { ...payload, created_at: new Date().toISOString() }
          saved.push(row); rows.push(row); writes.push(table)
          return json(single ? row : [row], 201)
        }
        if (historyError && !url.searchParams.has('id')) return json({ message: 'Synthetic history failure' }, 503)
        const id = url.searchParams.get('id')?.replace(/^eq\./, '')
        const matches = id ? rows.filter(row => row.id === id) : rows
        return json(single ? matches[0] || null : matches)
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        writes.push(table); return json({ message: 'Unexpected write blocked' }, 409)
      }
      if (table === 'profiles') return json(single ? { id: userId, full_name: 'Fictional therapist' } : [{ id: userId, full_name: 'Fictional therapist' }])
      return json(single ? null : [])
    }
    if (url.origin === 'http://127.0.0.1:5190') {
      if (url.pathname === '/api/billing/status') return json({ hasWorkspaceAccess: true, subscription: null })
      if (url.pathname === '/api/therapist-report') {
        if (request.method() === 'GET') return json({ quizVersion: BANK_VERSION, aiAvailable: ai })
        const body = request.postDataJSON(); aiRequests.push(body)
        const result = buildResult(body.answers, body.questionIds)
        return json({ mode: 'ai', quizVersion: BANK_VERSION, result, report: buildFallbackReport(result), promptVersion: 'synthetic-prompt', model: 'synthetic-model' })
      }
      if (url.pathname.startsWith('/api/')) return json({ connected: false, transcripts: [], events: [], appointments: [], data: [] })
      return route.continue()
    }
    remoteRequests.push(request.url()); return route.abort()
  })
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url')
  const access = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: userId, exp: expires, role: 'authenticated' }) + '.fictional-signature'
  await page.addInitScript(({ user, access, expires }) => {
    localStorage.setItem('sb-stance-test-auth-token', JSON.stringify({ access_token: access, refresh_token: 'fictional-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expires, user }))
  }, { user, access, expires })
  return { writes, saved, aiRequests, remoteRequests }
}

const questionIds = page => page.locator('[data-question]').evaluateAll(elements => elements.map(el => el.dataset.question))
async function checkLayout(page) {
  const sizes = await page.locator('.cpd-reflection').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }))
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1)
}
async function checkHeadingClearance(page, name) {
  const heading = page.getByRole('heading', { name, exact: true })
  const header = page.getByRole('link', { name: 'Back to Professional Development' })
  await expect.poll(async () => {
    const h = await heading.boundingBox(), navigation = await header.boundingBox()
    return h.y - (navigation.y + navigation.height)
  }).toBeGreaterThanOrEqual(0)
}
async function answerAll(page) {
  const questions = page.locator('[data-question]')
  for (let i = 0; i < 15; i++) await questions.nth(i).locator('input[type=radio]').first().check()
  await expect(page.getByTestId('answered-count')).toHaveText('15 answered')
  await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review your choices', exact: true })).toBeVisible()
}

test('balanced attempts, cancelled and confirmed restart, report saving and another reflection', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  const state = await mockWorkspace(page, { savedHistory: true })
  await page.goto('/supervision/practice-reflection')
  await page.getByRole('button', { name: 'Begin reflection' }).click()
  await page.getByRole('checkbox').uncheck()
  const first = await questionIds(page)
  expect(first).toHaveLength(15)
  expect(new Set(first).size).toBe(15)
  expect(first.every(id => !Object.hasOwn(legacyAnswers, id))).toBe(true)
  await checkLayout(page)
  await page.screenshot({ path: testInfo.outputPath('questions.png') })
  await page.locator('[data-question]').first().locator('input[type=radio]').first().check()
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Start a new reflection', exact: true }).click()
  expect(await questionIds(page)).toEqual(first)
  await expect(page.getByTestId('answered-count')).toHaveText('1 answered')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Start a new reflection', exact: true }).click()
  const second = await questionIds(page)
  expect(second.every(id => !first.includes(id))).toBe(true)
  await expect(page.getByTestId('answered-count')).toHaveText('0 answered')
  await answerAll(page)
  await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A reflection on your therapeutic stance', exact: true })).toBeVisible()
  await checkHeadingClearance(page, 'A reflection on your therapeutic stance')
  await checkLayout(page)
  await page.screenshot({ path: testInfo.outputPath('report.png') })
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Take another reflection', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A reflection on your therapeutic stance', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save to my reflection library', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved to my reflection library', exact: true })).toBeVisible()
  expect(state.saved).toHaveLength(1)
  const snapshot = state.saved[0].workspace_content.practiceReflection
  expect(snapshot.questionIds).toEqual(second)
  expect(Object.keys(snapshot.responses).sort()).toEqual([...second].sort())
  expect(snapshot.schemaVersion).toBe('cpd-stance-snapshot-v3')
  await page.getByRole('button', { name: 'Take another reflection', exact: true }).click()
  const third = await questionIds(page)
  expect(third.every(id => !first.includes(id) && !second.includes(id) && !Object.hasOwn(legacyAnswers, id))).toBe(true)
  await expect(page.getByTestId('answered-count')).toHaveText('0 answered')
  expect(state.saved[0].workspace_content.practiceReflection.questionIds).toEqual(second)
  await page.reload()
  await page.getByRole('button', { name: 'Begin reflection' }).click()
  expect(await questionIds(page)).toEqual(Object.keys(legacyAnswers))
  expect(state.aiRequests).toEqual([])
  expect(state.writes).toEqual(['private_reflections'])
  expect(errors).toEqual([])
})

test('AI writing receives and verifies the selected bank IDs; history failure keeps reflection usable', async ({ page }) => {
  const state = await mockWorkspace(page, { ai: true, historyError: true })
  await page.goto('/supervision/practice-reflection')
  await expect(page.getByRole('status')).toContainText('Saved question history could not be loaded')
  await page.getByRole('button', { name: 'Begin reflection' }).click()
  await page.getByRole('checkbox').uncheck()
  const selected = await questionIds(page)
  await answerAll(page)
  await page.getByRole('button', { name: 'Generate AI reflection', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A reflection on your therapeutic stance', exact: true })).toBeVisible()
  expect(state.aiRequests).toHaveLength(1)
  expect(state.aiRequests[0].questionIds).toEqual(selected)
  expect(state.aiRequests[0].quizVersion).toBe(BANK_VERSION)
  expect(state.writes).toEqual([])
  await checkLayout(page)
})
