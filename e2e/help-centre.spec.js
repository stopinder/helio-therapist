import { test, expect } from '@playwright/test'

const userId = '00000000-0000-4000-8000-000000000001'
const clientId = '00000000-0000-4000-8000-000000000002'
const sessionId = '00000000-0000-4000-8000-000000000003'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fictional@example.invalid', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Fictional therapist' }, created_at: '2026-01-01T00:00:00Z' }
const client = { id: clientId, user_id: userId, display_name: 'Fictional help test client', current_focus: '', archived: false }
const session = { id: sessionId, client_id: clientId, status: 'in_progress', occurred_at: '2026-09-27T09:00:00Z', created_at: '2026-09-27T09:00:00Z', version: 1 }

async function mockWorkspace(page, signedIn = true) {
  const writes = []
  // The test never contacts a remote service. Every remote request is mocked or blocked.
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.hostname === 'help-test.supabase.co') {
      if (url.pathname === '/auth/v1/user') return json(user)
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        writes.push(url.pathname)
        return route.fulfill({ status: 409, contentType: 'application/json', body: '{"message":"Unexpected write blocked by help test"}' })
      }
      const single = (request.headers().accept || '').includes('object+json')
      const table = url.pathname.split('/').pop()
      if (table === 'clients') return json(single ? client : [client])
      if (table === 'profiles') return json(single ? { id: userId, full_name: 'Fictional therapist' } : [{ id: userId, full_name: 'Fictional therapist' }])
      if (table === 'sessions') return json(single ? session : [session])
      return json(single ? null : [])
    }
    if (url.origin === 'http://127.0.0.1:5189') {
      if (url.pathname === '/api/billing/status') return json({ hasWorkspaceAccess: true, subscription: null })
      if (url.pathname === '/api/ai/client-session-summary' && request.postDataJSON()?.preview === true) return json({ data: { availableSessions: [] } })
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method())) writes.push(url.pathname)
        return json({ connected: false, transcripts: [], events: [], appointments: [], data: [] })
      }
      return route.continue()
    }
    return route.abort()
  })
  if (signedIn) {
    const expires = Math.floor(Date.now() / 1000) + 3600
    const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url')
    const access = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: userId, exp: expires, role: 'authenticated' }) + '.fictional-signature'
    await page.addInitScript(({ user, access, expires }) => {
      localStorage.setItem('sb-help-test-auth-token', JSON.stringify({ access_token: access, refresh_token: 'fictional-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expires, user }))
    }, { user, access, expires })
  }
  return writes
}

test('Help retains existing authentication guard', async ({ page }) => {
  await mockWorkspace(page, false)
  await page.goto('/help/client-summary')
  await expect(page).toHaveURL(/sign-in/)
  await expect(page.getByLabel('Email address')).toBeVisible()
})

test('search, categories, deep links and unknown article are usable', async ({ page }) => {
  const writes = await mockWorkspace(page)
  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'Help with Helios', exact: true })).toBeVisible()
  await page.getByLabel('Search Help', { exact: true }).fill('where does my reflection go?')
  await page.locator('.help-browser ul button').first().click()
  await expect(page.getByRole('heading', { name: 'One example from input to result' })).toBeVisible()
  await expect(page).toHaveURL(/help\/private-reflection$/)
  await page.getByRole('button', { name: 'Back to results', exact: true }).click()
  await expect(page.getByLabel('Search Help', { exact: true })).toHaveValue('where does my reflection go?')
  await page.getByLabel('Search Help', { exact: true }).fill('last 3 sessions')
  await page.locator('.help-browser ul button').first().click()
  await expect(page.getByRole('heading', { name: /three/i }).first()).toBeVisible()
  await page.reload()
  await expect(page.locator('article')).toContainText('anchor')
  await page.goto('/help/not-an-article')
  await expect(page.getByText('That help article is not available.', { exact: false })).toBeVisible()
  await page.getByLabel('Search Help', { exact: true }).fill('zzzz-no-topic')
  await expect(page.getByRole('heading', { name: 'No matching help yet' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await page.getByRole('button', { name: 'Care', exact: true }).click()
  await expect(page.locator('.help-browser ul > li')).toHaveCount(2)
  expect(writes).toEqual([])
})

test('Care draft survives panel search, keyboard dismissal and focus restoration', async ({ page }) => {
  const writes = await mockWorkspace(page)
  await page.goto('/clients/' + clientId)
  await page.getByRole('button', { name: '+ Reflect on Care', exact: true }).click()
  const field = page.getByPlaceholder('Type here, or use the microphone to dictate')
  await field.fill('Fictional unsaved Care thought')
  const beforeUrl = page.url()
  const trigger = page.getByRole('button', { name: 'How Care works', exact: true })
  await trigger.click()
  const help = page.getByRole('dialog', { name: 'Help with Helios' })
  await expect(help).toBeVisible()
  await expect(help.getByRole('heading', { name: 'From your thought to a saved change' })).toBeVisible()
  await help.getByLabel('Search Help', { exact: true }).fill('dictation')
  await help.locator('ul button').first().click()
  await expect(help.locator('article')).toContainText('alternative to typing')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(help).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(field).toHaveValue('Fictional unsaved Care thought')
  expect(page.url()).toBe(beforeUrl)
  expect(writes).toEqual([])
})

test('Reflection draft survives contextual Help on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const writes = await mockWorkspace(page)
  await page.goto('/clients/' + clientId + '/sessions/' + sessionId)
  await page.getByRole('button', { name: /Therapist reflection/ }).click()
  await page.locator('#stoodOut').fill('Fictional unsaved reflection')
  const trigger = page.getByRole('button', { name: 'How Therapist Reflection works', exact: true })
  await trigger.click()
  const help = page.getByRole('dialog', { name: 'Help with Helios' })
  await expect(help).toBeVisible()
  expect(await help.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await help.getByRole('button', { name: 'Close Help', exact: true }).click()
  await expect(page.locator('#stoodOut')).toHaveValue('Fictional unsaved reflection')
  await expect(trigger).toBeFocused()
  expect(writes).toEqual([])
})

test('Help fits desktop and mobile and does not retain search queries', async ({ page }) => {
  const writes = await mockWorkspace(page)
  await page.goto('/help')
  await expect(page.locator('.help-browser')).toBeVisible()
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    await page.getByLabel('Search Help', { exact: true }).fill('over time')
    expect(page.url()).not.toContain('over')
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('over time')))).toBe(false)
    expect(await page.locator('.help-browser').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await page.screenshot({ path: 'test-results/help/help-' + size.width + '.png', fullPage: true })
  }
  await page.reload()
  await expect(page.getByLabel('Search Help', { exact: true })).toHaveValue('')
  expect(writes).toEqual([])
})

test('Help closes independently above a dirty document composer', async ({ page }) => {
  const writes = await mockWorkspace(page)
  await page.goto('/clients/' + clientId)
  await page.getByRole('button', { name: 'Create session summary', exact: true }).click()
  const composer = page.getByTestId('client-document-composer')
  await composer.getByPlaceholder('Document title').fill('Fictional unsaved document title')
  await composer.getByLabel('Where things are now', { exact: true }).fill('Fictional unsaved document text')
  const trigger = composer.getByRole('button', { name: 'How client summaries work', exact: true })
  await trigger.click()
  const help = page.getByRole('dialog', { name: 'Help with Helios' })
  await expect(help).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(help).not.toBeVisible()
  await expect(composer).toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(composer.getByPlaceholder('Document title')).toHaveValue('Fictional unsaved document title')
  await expect(composer.getByLabel('Where things are now', { exact: true })).toHaveValue('Fictional unsaved document text')
  expect(writes).toEqual([])
})
