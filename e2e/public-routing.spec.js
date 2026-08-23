import { test, expect } from '@playwright/test';

test.describe('Gate 3 public routing', () => {
  test('landing page is public, substantive and links to account and information routes', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page).toHaveTitle('Helios — Therapist workspace');
    await expect(page.getByRole('heading', { name:'The clinical workspace for modern psychotherapy.' })).toBeVisible();
    await expect(page.getByText('AI-supported clinical workspace', { exact:true })).toBeVisible();
    await expect(page.getByText('Keep schedule, client context, session work, records and professional development connected.', { exact:false })).toBeVisible();
    await expect(page.getByLabel('Representative Helios therapist workspace')).toBeVisible();
    await expect(page.getByText('Schedule & continuity', { exact:true })).toBeVisible();
    await expect(page.getByText('Work requiring attention', { exact:true })).toBeVisible();
    await expect(page.getByText('AI assistance · therapist-triggered', { exact:true })).toBeVisible();
    await expect(page.getByText('Recent timeline', { exact:true })).toBeVisible();
    await expect(page.getByRole('link', { name:'See how Helio works' })).toHaveAttribute('href', '#platform');
    await expect(page.getByText('Calendar', { exact:true }).first()).toBeVisible();
    await expect(page.getByText('CPD', { exact:true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name:'Continuity across the whole professional day.' })).toBeVisible();
    await expect(page.getByText('Clinical Records are deliberate', { exact:false })).toBeVisible();
    await expect(page.getByRole('link', { name:'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('link', { name:'Get started' }).first()).toHaveAttribute('href', '/get-started');
    await expect(page.getByRole('link', { name:'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name:'AI & data' })).toHaveAttribute('href', '/ai-data');
    await expect(page.getByRole('link', { name:'Support' })).toHaveAttribute('href', '/support');
  });

  test('landing page remains readable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page.getByRole('heading', { name:'The clinical workspace for modern psychotherapy.' })).toBeVisible();
    await expect(page.getByLabel('Representative Helios therapist workspace')).toBeVisible();
    await expect(page.getByRole('link', { name:'Get started' }).last()).toBeVisible();
  });

  test('legal and information routes are available without authentication', async ({ page }) => {
    const routes = [['/terms','Terms of Service','Terms of Service — Helios'],['/privacy','Privacy Notice','Privacy Notice — Helios'],['/ai-data','AI & data processing','AI & data processing — Helios'],['/cookies','Cookie information','Cookie information — Helios'],['/support','Support & contact','Support & contact — Helios']];
    for (const [path, heading, title] of routes) {
      await page.goto(path, { waitUntil:'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${path}/?$`));
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.locator('main')).toContainText('Testing / beta');
    }
  });

  test('public information names the confirmed support contact and current processing providers', async ({ page }) => {
    await page.goto('/support', { waitUntil:'domcontentloaded' }); await expect(page.getByRole('link', { name:'hello@helio.works' }).first()).toHaveAttribute('href', 'mailto:hello@helio.works');
    await page.goto('/privacy', { waitUntil:'domcontentloaded' }); await expect(page.getByText('Supabase', { exact:false })).toBeVisible(); await expect(page.getByText('Vercel', { exact:false })).toBeVisible(); await expect(page.getByText('Resend', { exact:false })).toBeVisible(); await expect(page.getByText('Google', { exact:false })).toBeVisible(); await expect(page.getByText('Zoom', { exact:false })).toBeVisible();
    await page.goto('/ai-data', { waitUntil:'domcontentloaded' }); await expect(page.getByText('OpenAI', { exact:false })).toBeVisible(); await expect(page.getByText('not used to train its models by default', { exact:false })).toBeVisible();
    await page.goto('/cookies', { waitUntil:'domcontentloaded' }); await expect(page.getByText('does not include advertising or analytics tracking', { exact:false })).toBeVisible();
  });

  test('current terms scope Helios to individual therapist accounts', async ({ page }) => {
    await page.goto('/terms', { waitUntil:'domcontentloaded' });
    await expect(page.locator('main')).toContainText('individual therapists operating their own professional practice');
    await expect(page.locator('main')).toContainText('multi-user clinic accounts are not currently supported');
    await expect(page.getByRole('heading', { name:'Testing and beta service' })).toBeVisible();

    await page.goto('/privacy', { waitUntil:'domcontentloaded' });
    await expect(page.locator('main')).toContainText('individual therapists using a single account');
    await expect(page.locator('main')).toContainText('does not currently provide organisational, clinic-administrator or shared multi-practitioner accounts');
  });

  test('sign-in has a dedicated route', async ({ page }) => { await page.goto('/sign-in', { waitUntil:'domcontentloaded' }); await expect(page).toHaveTitle('Sign in — Helios'); await expect(page.getByTestId('login-page')).toBeVisible(); await expect(page.getByText('Sign in to your therapist workspace.')).toBeVisible(); await expect(page.getByLabel('Full name')).toHaveCount(0); });

  test('get-started opens account creation with legal information links', async ({ page }) => { await page.goto('/get-started', { waitUntil:'domcontentloaded' }); await expect(page).toHaveTitle('Get started — Helios'); await expect(page.getByTestId('login-page')).toBeVisible(); await expect(page.getByText('Create your therapist workspace.')).toBeVisible(); await expect(page.getByText('Full name')).toBeVisible(); await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms'); await expect(page.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy'); });
});
