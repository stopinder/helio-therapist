import { test, expect } from '@playwright/test';

test.describe('Session working material persistence', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }

    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('link', { name: /Clients/i }).click();
    await page.getByTestId('open-client-button').first().click();
    const openSessionButton = page.getByRole('button', { name: /Open Session Workspace/i });
    await expect(openSessionButton).toBeVisible();
    await openSessionButton.click();
  });

  test('working notes and private reflection survive reload and stay separate from clinical record', async ({ page }) => {
    const noteValue = `Working observation ${Date.now()}`;
    const reflectionValue = `Reflection stood out ${Date.now()}`;

    await page.getByRole('tab', { name: 'Notes' }).click();
    await page.getByLabel('Observations').fill(noteValue);
    await page.getByRole('button', { name: 'Save working notes' }).click();
    await expect(page.getByText('Working notes saved.')).toBeVisible();

    await page.getByRole('tab', { name: 'Reflection' }).click();
    await page.getByLabel('What stood out in this session?').fill(reflectionValue);
    await page.getByRole('button', { name: 'Save private reflection' }).click();
    await expect(page.getByText('Private reflection saved.')).toBeVisible();

    await page.reload();

    await page.getByRole('tab', { name: 'Notes' }).click();
    await expect(page.getByLabel('Observations')).toHaveValue(noteValue);

    await page.getByRole('tab', { name: 'Reflection' }).click();
    await expect(page.getByLabel('What stood out in this session?')).toHaveValue(reflectionValue);

    await page.getByRole('tab', { name: 'Clinical Record' }).click();
    await expect(page.getByTestId('clinical-summary-workspace')).not.toContainText(noteValue);
    await expect(page.getByTestId('clinical-summary-workspace')).not.toContainText(reflectionValue);
  });
});
