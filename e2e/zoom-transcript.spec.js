import { test, expect } from '@playwright/test'

const userId = '11111111-1111-4111-8111-111111111111'
const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const email = 'therapist@example.com'
const password = 'password123'

function base64Url(value) { return Buffer.from(JSON.stringify(value)).toString('base64url') }
const now = Math.floor(Date.now() / 1000)
const mockToken = [base64Url({ alg: 'HS256', typ: 'JWT' }), base64Url({ aud: 'authenticated', exp: now + 3600, iat: now, sub: userId, email, role: 'authenticated' }), 'playwright-signature'].join('.')

async function mockBase(page, transcripts = []) {
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: mockToken, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: userId, email, role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Test Therapist' } } }) }))
  await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, email, user_metadata: { full_name: 'Test Therapist' } }) }))
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId, full_name: 'Test Therapist', role: 'therapist' }) }))
  await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/clients*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: clientId, user_id: userId, display_name: 'Test Client', reference: 'test-ref', current_focus: '', archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }) }))
  await page.route('**/rest/v1/sessions*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: sessionId, client_id: clientId, occurred_at: '2026-08-12T10:00:00.000Z', status: 'in_progress', workflow_status: 'no_further_action', notes: '', notes_status: 'draft', version: 1, zoom_state: transcripts.length ? 'ready' : null, zoom_meeting_id: transcripts.length ? '123456789' : null, zoom_error: '', created_at: '2026-08-12T10:00:00Z', updated_at: '2026-08-12T10:00:00Z' }) }))
  await page.route('**/api/zoom/transcripts*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts }) }))
}

async function openWorkspace(page) {
  const workspaceUrl = `/clients/${clientId}/sessions/${sessionId}`
  await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded' })
  const loginEmail = page.getByLabel('Email address')
  const workspaceShell = page.getByTestId('workspace-shell')
  await expect(loginEmail.or(workspaceShell)).toBeVisible({ timeout: 15000 })
  if (await loginEmail.isVisible()) {
    await loginEmail.fill(email)
    await page.getByLabel('Password').fill(password)
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
    await expect(workspaceShell).toBeVisible({ timeout: 15000 })
    await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded' })
  }
  await expect(workspaceShell).toBeVisible({ timeout: 15000 })
}

test('shows imported Zoom transcript as read-only source material', async ({ page }) => {
  await mockBase(page, [{ id: 'transcript-1', provider: 'zoom', provider_meeting_id: '123456789', content: 'Client discussed sleep and work stress.', captured_at: '2026-08-12T11:00:00Z', created_at: '2026-08-12T11:01:00Z' }])
  await openWorkspace(page)
  await page.getByRole('button', { name: /Transcript/ }).click()
  await expect(page.getByText('Imported from Zoom')).toBeVisible()
  await expect(page.getByText('Client discussed sleep and work stress.')).toBeVisible()
  await expect(page.getByText('Source material only')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit transcript' })).toHaveCount(0)
})

test('shows empty transcript state when no transcript is available', async ({ page }) => {
  await mockBase(page)
  await openWorkspace(page)
  await page.getByRole('button', { name: /Transcript/ }).click()
  await expect(page.getByText('No transcript available')).toBeVisible()
})
