import { test, expect } from '@playwright/test'

test('signup confirmation guidance stays visible after moving to sign in', async ({ page }) => {
  await page.route('**/auth/v1/signup*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: '11111111-1111-4111-8111-111111111111', email: 'new-therapist@example.com' },
      session: null
    })
  }))

  await page.goto('/get-started', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Full name').fill('New Therapist')
  await page.getByLabel('Email address').fill('new-therapist@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByTestId('auth-success-message')).toContainText('Confirmation email sent')
  await expect(page.getByTestId('auth-success-message')).toBeInViewport()
})
