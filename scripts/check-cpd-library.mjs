import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { therapistQuestions } from '../src/quiz/therapist/questions.js'
import { validateReflectionSnapshot } from '../src/quiz/therapist/snapshot.js'

// Runs the built main app. Every remote service is simulated; no hosted records or AI calls.
const origin = 'http://127.0.0.1:4174'
const apiOrigin = 'https://cpd-test.supabase.co'
const userId = '11111111-1111-4111-8111-111111111111'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'cpd-test@example.invalid', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Synthetic therapist' }, created_at: '2026-01-01T00:00:00Z' }
const part = obj => Buffer.from(JSON.stringify(obj)).toString('base64url')
const token = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic-signature`
const session = { access_token: token, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
const browser = await chromium.launch()
await mkdir('artifacts/cpd-library', { recursive: true })
let currentPage
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: mobile ? 'reduce' : 'no-preference' })
    const page = currentPage = await context.newPage()
    page.setDefaultTimeout(18000)
    const rows = new Map(), writes = [], errors = [], aiCalls = []
    let failNextInsert = true
    page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR', error.message) })
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url())
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*' }, body: JSON.stringify(body) })
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,DELETE,PATCH,OPTIONS' } })
      if (url.origin === apiOrigin) {
        if (url.pathname === '/auth/v1/user') return json(user)
        if (url.pathname === '/auth/v1/token') return json(session)
        if (url.pathname === '/rest/v1/private_reflections') {
          assert.equal(request.headers().authorization, `Bearer ${token}`)
          if (request.method() === 'POST') {
            const payload = request.postDataJSON()
            writes.push(payload)
            assert.equal(payload.user_id, userId)
            assert.equal(payload.client_id, null)
            assert.equal(payload.session_ref, null)
            assert.equal(payload.included_in_supervision, false)
            assert.equal(payload.workspace_content.captureSource, 'practice_reflection')
            assert.equal(payload.workspace_content.reflectiveMap, undefined)
            validateReflectionSnapshot(payload.workspace_content.practiceReflection)
            if (failNextInsert) { failNextInsert = false; return json({ message: 'Synthetic connection failure' }, 503) }
            if (rows.has(payload.id)) return json({ code: '23505' }, 409)
            const row = { ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), clients: null }
            rows.set(row.id, row)
            return json(row, 201)
          }
          assert.equal(request.method(), 'GET', 'Saving must not patch or delete historical reflections')
          assert.equal(url.searchParams.get('user_id'), `eq.${userId}`)
          const id = url.searchParams.get('id')?.replace(/^eq\./, '')
          const data = id ? (rows.has(id) ? [rows.get(id)] : []) : [...rows.values()]
          return json(data)
        }
        if (url.pathname === '/rest/v1/profiles') return json({ id: userId, full_name: 'Synthetic therapist', practice_name: 'Test practice', onboarding_completed_at: '2026-01-01T00:00:00Z' })
        return json([])
      }
      if (url.origin === origin) {
        if (url.pathname.startsWith('/api/')) {
          if (/reflect|continuity|openai/i.test(url.pathname)) aiCalls.push(url.pathname)
          return json({ connected: false, success: true, items: [] })
        }
        return route.continue()
      }
      // Do not access external font, integration, tracking or AI services in this test.
      return route.abort()
    })
    await page.goto(`${origin}/supervision/practice-reflection`)
    await page.waitForURL('**/sign-in?**')
    await page.evaluate(value => localStorage.setItem('sb-cpd-test-auth-token', JSON.stringify(value)), session)
    await page.goto(`${origin}/supervision/reflections`)
    await page.getByRole('link', { name: 'Reflect on your therapeutic stance', exact: true }).click()
    await page.getByRole('heading', { name: 'Your therapeutic stance', exact: true }).waitFor()
    await page.locator('.cpd-reflection').getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Begin reflection', exact: true }).click()
    for (let index = 0; index < therapistQuestions.length; index++) {
      const q = therapistQuestions[index]
      await page.locator(`input[name="${q.id}"][value="a"]`).locator('..').click()
      await page.waitForFunction(n => document.querySelector('[data-testid="answered-count"]')?.textContent === `${n} answered`, index + 1)
      if (index < 14) {
        await page.waitForFunction(id => {
          const header = document.querySelector('[data-testid="progress-header"]'), target = document.querySelector(`[data-question="${id}"]`)
          if (!header || !target) return false
          let scrollParent = header.parentElement
          while (scrollParent && !/(auto|scroll)/.test(getComputedStyle(scrollParent).overflowY)) scrollParent = scrollParent.parentElement
          const top = scrollParent ? scrollParent.getBoundingClientRect().top : 0
          const h = header.getBoundingClientRect(), t = target.getBoundingClientRect()
          return Math.abs(h.top - top) < 3 && t.top >= h.bottom - 1 && t.top <= h.bottom + 36
        }, therapistQuestions[index + 1].id)
      }
    }
    await page.getByTestId('continue-button').click()
    await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
    await page.getByRole('heading', { name: 'A reflection on your therapeutic stance', exact: true }).waitFor()
    assert.equal(await page.locator('.report-section').count(), 9)
    assert.equal(writes.length, 0, 'Reading must not automatically save')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save reflection as text', exact: true }).click()
    assert.equal((await download).suggestedFilename(), 'cpd-practice-reflection.txt')
    assert.equal(writes.length, 0, 'Download must not save into the library')
    const save = page.getByRole('button', { name: 'Save to my reflection library', exact: true })
    await save.click()
    await page.getByText(/The save was not confirmed\. Your reflection is still here/).waitFor()
    assert.equal(rows.size, 0)
    await save.click()
    await page.getByText('Saved privately. No continuity analysis has been run.', { exact: true }).waitFor()
    assert.equal(rows.size, 1)
    assert.equal(writes.length, 2)
    assert.equal(writes[0].id, writes[1].id, 'Retry uses the same snapshot UUID')
    assert.equal(await page.getByRole('button', { name: 'Saved to my reflection library', exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
    await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Saved to my reflection library', exact: true }).isDisabled(), true)
    assert.equal(writes.length, 2, 'Re-reading unchanged report does not create a duplicate')
    await page.getByRole('button', { name: 'View my reflection library', exact: true }).click()
    await page.waitForURL('**/supervision/reflections')
    await page.getByPlaceholder('Search reflections...').fill('Your therapeutic stance')
    await page.getByText(/CPD · Practice reflection — Your therapeutic stance/).first().waitFor()
    await page.reload()
    await page.getByText(/CPD · Practice reflection — Your therapeutic stance/).first().waitFor()
    assert.deepEqual(aiCalls, [], 'Saving and reloading must not trigger an AI/continuity call')
    assert.deepEqual(errors, [])
    await page.screenshot({ path: `artifacts/cpd-library/${mobile ? 'mobile' : 'desktop'}-library.png`, fullPage: false })
    console.log(`${mobile ? 'mobile' : 'desktop'}: authenticated native route, sticky auto-scroll, text download, failed-save retry, source snapshot and library reload passed with simulated services`)
    await context.close()
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    console.error('UI DIAGNOSTIC', (await currentPage.locator('body').innerText()).slice(-6000))
    await currentPage.screenshot({ path: 'artifacts/cpd-library/failure.png', fullPage: false })
  }
  throw error
} finally { await browser.close() }
