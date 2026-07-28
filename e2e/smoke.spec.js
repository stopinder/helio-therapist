import { test, expect } from '@playwright/test'

test('app should load and show either login page or authenticated workspace', async ({ page }) => {
  const pageErrors = []

  page.on('pageerror', error => {
    console.log('Browser Error:', error.message)
    pageErrors.push(error.message)
  })

  page.on('console', msg => {
    console.log(`Browser Console [${msg.type()}]:`, msg.text())
  })

  const response = await page.goto('/')

  expect(response, 'The app did not return a page response').not.toBeNull()
  expect(
    response.status(),
    `The app returned HTTP ${response.status()}`,
  ).toBeLessThan(400)

  const loginPage = page.getByTestId('login-page')
  const workspaceShell = page.getByTestId('workspace-shell')
  const configError = page.getByText('Configuration Error')

  // Wait for any meaningful content to appear
  await expect(
    loginPage.or(workspaceShell).or(configError),
    'Expected either the login page, authenticated workspace, or config error',
  ).toBeVisible({ timeout: 15_000 })

  const bodyHTML = await page.locator('body').innerHTML()
  console.log('Final Body HTML:', bodyHTML)

  // Fail if configuration error is shown
  expect(bodyHTML).not.toContain('Configuration Error')

  await expect(page.locator('body')).not.toBeEmpty()

  expect(
    pageErrors,
    `Unexpected browser errors:\n${pageErrors.join('\n')}`,
  ).toEqual([])
})
