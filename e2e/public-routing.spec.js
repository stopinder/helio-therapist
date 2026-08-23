import { test, expect } from '@playwright/test';

test.describe('Gate 3 public routing', () => {
  test('landing page is public, substantive and links to account and information routes', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page).toHaveTitle('Helios — Therapist workspace');
    await expect(page.getByRole('heading', { name:'The clinical workspace for modern psychotherapy.' })).toBeVisible();
    await expect(page.getByText('Clinical workspace for therapists', { exact:true })).toBeVisible();
    await expect(page.getByText("Helios brings the working context around a therapist's practice together", { exact:false })).toBeVisible();
    await expect(page.getByLabel('Representative Helios therapist workspace')).toBeVisible();
    await expect(page.getByText("Today's work", { exact:true })).toBeVisible();
    await expect(page.getByText('Work requiring attention', { exact:true })).toBeVisible();
    await expect(page.getByText('Therapist-triggered', { exact:true })).toBeVisible();
    await expect(page.getByRole('link', { name:'See how Helio works' })).toHaveAttribute('href', '#how-it-works');
    await expect(page.getByText('Calendar', { exact:true }).first()).toBeVisible();
    await expect(page.getByText('CPD', { exact:true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name:'Continuity before, during, after — and between sessions.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'The tools you already use, brought back into one clinical flow.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'Your development has continuity too.' })).toBeVisible();
    await expect(page.getByText('Clinical Records are deliberate')).toBeVisible();
    await expect(page.getByText('Approved records are immutable; later corrections are append-only amendments.')).toBeVisible();
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
    await expect(page.getByRole('heading', { name:'Before the session' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'Between sessions' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'Your judgement, always' })).toBeVisible();
    await expect(page.getByRole('link', { name:'Get started' }).last()).toBeVisible();
  });

  test('legal and information routes are available without authentication', async ({ page }) => {
    const routes = [
      ['/terms', 'Terms of Service', 'Terms of Service — Helios'],
      ['/privacy', 'Privacy Notice', 'Privacy Notice — Helios'],
      ['/ai-data', 'AI & data processing', 'AI & data processing — Helios'],
      ['/cookies', 'Cookie information', 'Cookie information — Helios'],
      ['/support', 'Support & contact', 'Support & contact — Helios']
    ];

    for (const [path, heading, title] of routes) {
      await page.goto(path, { waitUntil:'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByText('Testing / beta', { exact: false })).toBeVisible();
    }
  });

  test('public information names the confirmed support contact and current processing providers', async ({ page }) => {
    await page.goto('/support', { waitUntil:'domcontentloaded' });
    await expect(page.getByRole('link', { name:'hello@helio.works' }).first()).toHaveAttribute('href', 'mailto:hello@helio.works');

    await page.goto('/privacy', { waitUntil:'domcontentloaded' });
    await expect(page.getByText('Supabase', { exact:false })).toBeVisible();
    await expect(page.getByText('Vercel', { exact:false })).toBeVisible();
    await expect(page.getByText('Resend', { exact:false })).toBeVisible();
    await expect(page.getByText('Google', { exact:false })).toBeVisible();
    await expect(page.getByText('Zoom', { exact:false })).toBeVisible();

    await page.goto('/ai-data', { waitUntil:'domcontentloaded' });
    await expect(page.getByText('OpenAI', { exact:false })).toBeVisible();
    await expect(page.getByText('not used to train its models by default', { exact:false })).toBeVisible();

    await page.goto('/cookies', { waitUntil:'domcontentloaded' });
    await expect(page.getByText('does not include advertising or analytics tracking', { exact:false })).toBeVisible();
  });

  test('current terms scope Helios to individual therapist accounts', async ({ page }) => {
    await page.goto('/terms', { waitUntil:'domcontentloaded' });
    await expect(page.getByText('individual therapists operating their own professional practice', { exact:false })).toBeVisible();
    await expect(page.getByText('multi-user clinic accounts are not currently supported', { exact:false })).toBeVisible();
    await expect(page.getByText('Testing and beta service', { exact:true })).toBeVisible();

    await page.goto('/privacy', { waitUntil:'domcontentloaded' });
    await expect(page.getByText('individual therapists using a single account', { exact:false })).toBeVisible();
    await expect(page.getByText('does not currently provide organisational, clinic-administrator or shared multi-practitioner accounts', { exact:false })).toBeVisible();
  });

  test('sign-in has a dedicated route', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil:'domcontentloaded' });
    await expect(page).toHaveTitle('Sign in — Helios');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Sign in to your therapist workspace.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);
  });

  test('get-started opens account creation with legal information links', async ({ page }) => {
    await page.goto('/get-started', { waitUntil:'domcontentloaded' });
    await expect(page).toHaveTitle('Get started — Helios');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Create your therapist workspace.')).toBeVisible();
    await expect(page.getByText('Full name')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy');
  });
});
