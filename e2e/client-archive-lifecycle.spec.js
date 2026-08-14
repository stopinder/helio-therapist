import { test, expect } from '@playwright/test'

test.describe('Client archive lifecycle', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD

  test.beforeEach(async () => {
    if (!email || !password) test.skip(true, 'Skipping authenticated test: credentials are not set.')
  })

  test('archive retains the client, blocks new session entry, and restore returns it to active work', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
    await page.getByRole('link', { name: /Clients/i }).click()

    await page.getByRole('button', { name: '+ Add Client' }).click()
    const clientName = `Archive Lifecycle ${Date.now()}`
    await page.getByPlaceholder('Client name').fill(clientName)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.locator('tr').filter({ hasText: clientName }).getByTestId('open-client-button').click()

    page.once('dialog', dialog => dialog.accept())
    await page.getByTestId('client-archive-action').click()
    await expect(page.getByText('Archived client.')).toBeVisible()
    await expect(page.getByTestId('open-clinical-workspace')).toHaveCount(0)
    await expect(page.getByTestId('client-archive-action')).toHaveText('Restore client')

    await page.getByRole('link', { name: /Clients/i }).click()
    await expect(page.locator('tr').filter({ hasText: clientName })).toHaveCount(0)
    await page.getByRole('button', { name: 'Archived', exact: true }).click()
    const archivedRow = page.locator('tr').filter({ hasText: clientName })
    await expect(archivedRow).toBeVisible()
    await archivedRow.getByTestId('open-client-button').click()

    page.once('dialog', dialog => dialog.accept())
    await page.getByTestId('client-archive-action').click()
    await expect(page.getByText('Archived client.')).toHaveCount(0)
    await expect(page.getByTestId('open-clinical-workspace')).toBeVisible()
    await expect(page.getByTestId('client-archive-action')).toHaveText('Archive client')
  })
})
