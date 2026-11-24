import { test, expect } from '@playwright/test'

test('tagged landing visit sends exactly one sanitised request across SPA navigation', async ({ page }) => {
  const requests = []
  await page.route('https://capture.example.com/**', async route => {
    requests.push(route.request())
    await route.fulfill({ status: 200, body: '1', headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.goto('/?utm_source=apollo&utm_medium=email&utm_campaign=helios_test&email=private@example.com&utm_content=clinical-note#pricing')
  await expect.poll(() => requests.length).toBe(1)
  const request = requests[0]
  expect(request.headers().referer).toBeUndefined()
  expect(request.headers().cookie).toBeUndefined()
  expect(request.postDataJSON()).toEqual({ api_key: 'test-only', event: '$pageview', distinct_id: expect.any(String),
    properties: { $pathname: '/', $process_person_profile: false, $geoip_disable: true,
      utm_source: 'apollo', utm_medium: 'email', utm_campaign: 'helios_test' } })
  await page.getByRole('link', { name: 'Sign in', exact: true }).first().click()
  await expect(page).toHaveURL(/sign-in/)
  await page.getByRole('link', { name: /Helios home/ }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await page.waitForTimeout(500)
  expect(requests).toHaveLength(1)
})

test('sign-in and authenticated workspace send no PostHog traffic', async ({ page }) => {
  const requests = []
  await page.route('https://capture.example.com/**', route => { requests.push(route.request()); return route.abort() })
  const userId = '11111111-1111-4111-8111-111111111111'
  const email = 'therapist@example.com'
  const now = Math.floor(Date.now() / 1000)
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = [encode({ alg: 'HS256', typ: 'JWT' }), encode({ aud: 'authenticated', exp: now + 3600, iat: now, sub: userId, email, role: 'authenticated' }), 'test-signature'].join('.')
  await page.route('**/auth/v1/token*', route => route.fulfill({ json: { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh', user: { id: userId, email, role: 'authenticated', aud: 'authenticated' } } }))
  await page.route('**/auth/v1/user', route => route.fulfill({ json: { id: userId, email } }))
  await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }))
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ json: { id: userId, role: 'therapist', full_name: 'Test Therapist' } }))
  await page.route('**/api/**', route => route.fulfill({ json: {} }))
  await page.route('**/api/billing/status*', route => route.fulfill({ json: { hasWorkspaceAccess: true, subscription: { status: 'trialing' } } }))
  await page.goto('/sign-in?utm_source=apollo&utm_campaign=helios_test')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByTestId('workspace-shell')).toBeVisible()
  await page.getByRole('link', { name: 'Clients', exact: true }).first().click()
  await expect(page).toHaveURL(/\/clients$/)
  await page.waitForTimeout(500)
  expect(requests).toHaveLength(0)
})
