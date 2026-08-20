import { test, expect } from '@playwright/test';

test.describe('Gate 3 public routing', () => {
  test('landing page is public and links to account and information routes', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page.getByRole('heading', { name:'A calmer place for the work around therapy.' })).toBeVisible();
    await expect(page.getByRole('link', { name:'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('link', { name:'Get started' }).first()).toHaveAttribute('href', '/get-started');
    await expect(page.getByRole('link', { name:'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name:'AI & data' })).toHaveAttribute('href', '/ai-data');
    await expect(page.getByRole('link', { name:'Support' })).toHaveAttribute('href', '/support');
  });

  test('legal and information routes are available without authentication', async ({ page }) => {
    const routes = [
      ['/terms', 'Terms of Service'],
      ['/privacy', 'Privacy Notice'],
      ['/ai-data', 'AI & data processing'],
      ['/cookies', 'Cookie information'],
      ['/support', 'Support & contact']
    ];

    for (const [path, heading] of routes) {
      await page.goto(path, { waitUntil:'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByText('Launch draft', { exact: false })).toBeVisible();
    }
  });

  test('sign-in has a dedicated route', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil:'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Sign in to your therapist workspace.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);
  });

  test('get-started opens account creation with legal information links', async ({ page }) => {
    await page.goto('/get-started', { waitUntil:'domcontentloaded' });
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Create your therapist workspace.')).toBeVisible();
    await expect(page.getByText('Full name')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy');
  });
});
