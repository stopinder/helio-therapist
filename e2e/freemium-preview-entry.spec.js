import { test, expect } from '@playwright/test';

test('landing pricing matches the no-card Free offer', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const pricing = page.locator('#pricing');
  await expect(pricing.getByRole('heading', { name: /Free forever/ })).toBeVisible();
  await expect(pricing).toContainText('five active clients');
  await expect(pricing).toContainText('£29/month');
  await expect(pricing).toContainText('£290/year');
  await expect(pricing).toContainText('no payment card required');
  await expect(page.locator('main')).not.toContainText(/Start your 7-day free trial|7 days free, then/);
  await pricing.getByRole('link', { name: /Start Free/ }).click();
  await expect(page).toHaveURL(/\/get-started\/?$/);
  await expect(page.getByText('No payment card required.')).toBeVisible();
});

test('public terms describe Free and optional paid upgrades without new trials', async ({ page }) => {
  await page.goto('/terms', { waitUntil: 'domcontentloaded' });
  const pricing = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pricing and billing' }) });
  await expect(pricing).toContainText('Free plan without entering payment details');
  await expect(pricing).toContainText('£29/month or £290/year paid upfront');
  await expect(pricing).not.toContainText('after a 7-day free trial');
});
