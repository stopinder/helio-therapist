import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { therapistQuestions, QUIZ_VERSION } from '../src/quiz/therapist/questions.js'
import { DISCLAIMER, BOUNDARY_NOTE } from '../src/quiz/therapist/content.js'
import { buildResult, buildFallbackReport } from '../src/quiz/therapist/buildResult.js'
import { validateReflectionSnapshot } from '../src/quiz/therapist/snapshot.js'
import { THERAPEUTIC_STANCE_PROMPT_VERSION } from '../api/_lib/therapeutic-stance-report.js'

// Built main app with simulated services only. No hosted records or provider calls.
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
async function openSavedEntry(page) {
  const row = page.getByTestId('pd-timeline-row').first()
  await row.locator('[tabindex="0"]').click()
  await row.getByText(/CPD · Practice reflection — Your therapeutic stance/).waitFor()
  await row.getByRole('button', { name: 'Open Details', exact: true }).waitFor()
}
async function checkFootnote(page) {
  const note = page.getByTestId('reflection-footnote')
  assert.equal(await note.count(), 1)
  assert.equal(await note.innerText(), DISCLAIMER)
  const size = await note.locator('small').evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  assert.ok(size >= 12 && size <= 14, `Note must remain readable and secondary; got ${size}px`)
  assert.equal(await page.locator('.notice.boundary').count(), 0)
  assert.equal(await page.locator('.cpd-reflection').getByText(BOUNDARY_NOTE, { exact: true }).count(), 0)
}
try {
  for (const { mobile, ai } of [{ mobile: false, ai: false }, { mobile: true, ai: false }, { mobile: false, ai: true }]) {
    const label = ai ? 'desktop-mocked-ai' : mobile ? 'mobile' : 'desktop'
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: mobile ? 'reduce' : 'no-preference' })
    const page = currentPage = await context.newPage()
    page.setDefaultTimeout(18000)
    const rows = new Map(), writes = [], errors = [], aiCalls = []
    let failNextInsert = true, failNextGeneration = true
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
            const snapshot = validateReflectionSnapshot(payload.workspace_content.practiceReflection)
            assert.equal(snapshot.narrative.mode, ai ? 'ai' : 'fallback')
            assert.equal(snapshot.narrative.promptVersion, ai ? THERAPEUTIC_STANCE_PROMPT_VERSION : null)
            assert.equal(snapshot.narrative.model, ai ? 'synthetic-test-model' : null)
            assert.equal(payload.body.endsWith(DISCLAIMER), true)
            assert.equal(payload.body.split(DISCLAIMER).length - 1, 1)
            assert.equal(payload.body.includes(BOUNDARY_NOTE), false)
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
        if (url.pathname === '/api/therapist-report') {
          assert.equal(request.headers().authorization, `Bearer ${token}`)
          if (request.method() === 'GET') return json({ quizVersion: QUIZ_VERSION, aiAvailable: ai, promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION })
          assert.equal(request.method(), 'POST')
          assert.equal(ai, true)
          const body = request.postDataJSON()
          assert.deepEqual(Object.keys(body).sort(), ['answers', 'quizVersion'])
          assert.equal(Object.hasOwn(body, 'consent'), false, 'No synthetic consent flag is sent')
          aiCalls.push(url.pathname)
          if (failNextGeneration) { failNextGeneration = false; return json({ error: 'Simulated writing failure. Your choices are preserved.' }, 503) }
          const result = buildResult(body.answers), report = buildFallbackReport(result)
          report.sections[0].paragraphs = ['Synthetic narrative for testing display and provenance, not a live model output.']
          return json({ mode: 'ai', quizVersion: QUIZ_VERSION, result, report, promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION, model: 'synthetic-test-model' })
        }
        if (url.pathname.startsWith('/api/')) {
          if (/reflect|continuity|openai/i.test(url.pathname)) aiCalls.push(url.pathname)
          return json({ connected: false, success: true, items: [] })
        }
        return route.continue()
      }
      return route.abort()
    })
    await page.goto(`${origin}/supervision/practice-reflection`)
    await page.waitForURL('**/sign-in?**')
    await page.evaluate(value => localStorage.setItem('sb-cpd-test-auth-token', JSON.stringify(value)), session)
    await page.goto(`${origin}/supervision/reflections`)
    await page.getByRole('link', { name: 'Reflect on your therapeutic stance', exact: true }).click()
    await page.getByRole('heading', { name: 'Your therapeutic stance', exact: true }).waitFor()
    await checkFootnote(page)
    assert.equal(await page.locator('.cpd-reflection').getByRole('checkbox').count(), 0, 'No acknowledgement gate before beginning')
    await page.screenshot({ path: `artifacts/cpd-library/${label}-intro.png` })
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
          const stickyInset = parseFloat(getComputedStyle(header).top) || 0
          const h = header.getBoundingClientRect(), t = target.getBoundingClientRect()
          // Retain both requirements: the approved host inset and a fully clear question.
          return Math.abs(h.top - top - stickyInset) < 3 && t.top >= h.bottom - 1 && t.top <= h.bottom + 36
        }, therapistQuestions[index + 1].id)
      }
    }
    assert.equal(await page.getByRole('button', { name: 'Review my choices', exact: true }).count(), 1)
    await page.getByTestId('continue-button').click()
    assert.equal(await page.getByTestId('reflection-footnote').count(), 0, 'No repeated notice on review')
    assert.equal(await page.locator('.cpd-reflection').getByRole('checkbox').count(), 0, 'No separate permission step on review')
    assert.deepEqual(aiCalls, [], 'Finishing the questions does not request generation')
    await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
    await page.getByRole('heading', { name: 'A reflection on your therapeutic stance', exact: true }).waitFor()
    await checkFootnote(page)
    assert.deepEqual(aiCalls, [], 'Opening and reading do not request generation')
    if (ai) {
      await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
      const generate = page.getByRole('button', { name: 'Generate AI reflection', exact: true })
      assert.equal(await generate.isEnabled(), true, 'Generate is ready without ticking a permission box')
      assert.equal(await page.locator('.ai-option').getByRole('checkbox').count(), 0)
      assert.deepEqual(aiCalls, [], 'Returning to review does not request generation')
      await generate.click()
      await page.getByText('Simulated writing failure. Your choices are preserved.', { exact: true }).waitFor()
      assert.equal(aiCalls.length, 1, 'One click sends one generation request')
      assert.equal(await page.locator('.review-row').count(), 15)
      await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
      await checkFootnote(page)
      await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
      await generate.click()
      await page.getByText('AI-written integrative reflection', { exact: true }).waitFor()
      await checkFootnote(page)
    }
    assert.equal(await page.locator('.report-section').count(), 9)
    assert.equal(writes.length, 0, 'Reading must not automatically save')
    assert.equal(await page.evaluate(() => {
      const note = document.querySelector('[data-testid="reflection-footnote"]')
      const lastSection = [...document.querySelectorAll('.report-section')].at(-1)
      return Boolean(lastSection.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING)
    }), true)
    await page.screenshot({ path: `artifacts/cpd-library/${label}-report.png` })
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save reflection as text', exact: true }).click()
    const download = await downloadPromise
    assert.equal(download.suggestedFilename(), 'cpd-practice-reflection.txt')
    const text = await readFile(await download.path(), 'utf8')
    assert.equal(text.endsWith(DISCLAIMER), true)
    assert.equal(text.split(DISCLAIMER).length - 1, 1)
    assert.equal(text.includes(BOUNDARY_NOTE), false)
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
    if (!ai) {
      await page.getByRole('button', { name: 'Review my choices', exact: true }).click()
      await page.getByRole('button', { name: 'Read reflection', exact: true }).click()
      assert.equal(await page.getByRole('button', { name: 'Saved to my reflection library', exact: true }).isDisabled(), true)
      assert.equal(writes.length, 2, 'Re-reading unchanged report does not create a duplicate')
    }
    await page.getByRole('button', { name: 'View my reflection library', exact: true }).click()
    await page.waitForURL('**/supervision/reflections')
    await page.getByPlaceholder('Search reflections...').fill('Your therapeutic stance')
    await openSavedEntry(page)
    await page.reload()
    await openSavedEntry(page)
    assert.deepEqual(aiCalls, ai ? ['/api/therapist-report', '/api/therapist-report'] : [], 'Only explicit generation requests are permitted')
    assert.deepEqual(errors, [])
    await page.screenshot({ path: `artifacts/cpd-library/${label}-library.png`, fullPage: false })
    console.log(`${label}: quiet note, sticky auto-scroll, direct generation, text export, failed-save retry, provenance and library reload passed with simulated services`)
    await context.close()
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    console.error('UI DIAGNOSTIC', (await currentPage.locator('body').innerText()).slice(-6000))
    console.error('SCROLL GEOMETRY', await currentPage.evaluate(() => {
      const header = document.querySelector('[data-testid="progress-header"]')
      const rect = el => el ? { top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom } : null
      return { header: rect(header), inset: header ? getComputedStyle(header).top : null,
        questions: [...document.querySelectorAll('[data-question]')].slice(0, 3).map(el => ({ id: el.dataset.question, rect: rect(el), margin: getComputedStyle(el).scrollMarginTop })) }
    }))
    await currentPage.screenshot({ path: 'artifacts/cpd-library/failure.png', fullPage: false })
  }
  throw error
} finally { await browser.close() }
