import { test, expect } from '@playwright/test';

test.describe('Gate 3 public routing', () => {
  test('landing page is public and links to account entry routes', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page.getByRole('heading', { name:'A calmer place for the work around therapy.' })).toBeVisible();
    await expect(page.getByRole('link', { name:'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('link', { name:'Get started' }).first()).toHaveAttribute('href', '/get-started');
  });

  test('sign-in has a dedicated route', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil:'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Sign in to your therapist workspace.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);
  });

  test('get-started opens account creation', async ({ page }) => {
    await page.goto('/get-started', { waitUntil:'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Create your therapist workspace.')).toBeVisible();
    await expect(page.getByText('Full name')).toBeVisible();
  });
});
