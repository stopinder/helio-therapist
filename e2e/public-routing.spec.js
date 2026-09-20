import { test, expect } from '@playwright/test';

test.describe('Gate 3 public routing', () => {
  test('landing page is public, substantive and links to account and information routes', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    await expect(page).toHaveTitle('Helios — Therapist workspace');

    await expect(page.getByRole('heading', { name:'Less to hold in your head. More space for the work that matters.' })).toBeVisible();
    await expect(page.getByText('Continuity & reflection for therapists', { exact:true }).first()).toBeVisible();
    await expect(page.getByText('Helios is a continuity and reflection system for therapists.', { exact:false })).toBeVisible();

    await expect(page.getByLabel('Representative Helios therapist workspace')).toBeVisible();
    await expect(page.getByText('Sarah M. · 10:00', { exact:true }).first()).toBeVisible();
    await expect(page.getByText('Transcript attached', { exact:true })).toBeVisible();
    await expect(page.getByText('Ready to review', { exact:true })).toBeVisible();
    await expect(page.getByText('Possible recurring pattern: a pull to rescue when clients become distant.', { exact:true })).toBeVisible();

    await expect(page.getByRole('link', { name:'See Helios in action' })).toHaveAttribute('href', '#product-tour');
    await expect(page.getByRole('heading', { name:'The whole thread of the work, in one place.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'The session doesn’t disappear when the call ends.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'See how the work is developing over time.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'The practical side of practice, connected to the clinical work.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'A private place to think across the work.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'Supervision preparation', exact:true })).toBeVisible();
    await expect(page.getByRole('heading', { name:'AI assists. You remain the clinician.' })).toBeVisible();
    await expect(page.getByRole('heading', { name:'A practitioner’s perspective.' })).toBeVisible();

    await expect(page.getByRole('link', { name:'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('link', { name:'Create workspace' }).first()).toHaveAttribute('href', '/get-started');
    await expect(page.getByRole('link', { name:'Privacy' }).first()).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name:'AI & data' }).first()).toHaveAttribute('href', '/ai-data');
    await expect(page.getByRole('link', { name:'Support' }).first()).toHaveAttribute('href', '/support');
  });

  test('launch pricing presents one workspace and routes to account creation', async ({ page }) => {
    await page.goto('/', { waitUntil:'domcontentloaded' });
    const pricing = page.locator('#pricing');
    await expect(pricing.getByRole('heading', { name:'One workspace. One simple price.' })).toBeVisible();
    await expect(pricing.getByText('The full Helios therapist workspace, included.', { exact:true })).toBeVisible();
    await expect(pricing.getByText('Launch pricing', { exact:true })).toBeVisible();
    await expect(pricing.getByText('£29', { exact:true })).toBeVisible();
    await expect(pricing.getByText('/ month', { exact:true })).toBeVisible();
    await expect(pricing.getByText('30 days free to try Helios.', { exact:true })).toBeVisible();
    await expect(pricing.getByRole('heading', { name:'Founder offer — £24/month' })).toBeVisible();
    await expect(pricing).toContainText('Available to early adopters. Keep the founder rate while you remain continuously subscribed.');
    await expect(pricing).not.toContainText('£49');
    const cta = pricing.getByRole('link', { name:'Create your workspace' });
    await expect(cta).toHaveAttribute('href', '/get-started');
    await cta.click();
    await expect(page).toHaveURL(/\/get-started\/?$/);
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByText('Create your therapist workspace.')).toBeVisible();
  });

  test('landing page remains readable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil:'domcontentloaded' });

    await expect(page.getByRole('heading', { name:'Less to hold in your head. More space for the work that matters.' })).toBeVisible();
    await expect(page.getByLabel('Representative Helios therapist workspace')).toBeVisible();
    await expect(page.getByRole('link', { name:'See Helios in action' })).toBeVisible();
    await expect(page.getByRole('link', { name:'Create your workspace' }).last()).toBeVisible();
  });

  test('legal and information routes are available without authentication', async ({ page }) => {
    const routes = [['/terms','Terms of Service','Terms of Service — Helios'],['/privacy','Privacy Notice','Privacy Notice — Helios'],['/ai-data','AI & data processing','AI & data processing — Helios'],['/cookies','Cookie information','Cookie information — Helios'],['/support','Support & contact','Support & contact — Helios']];
    for (const [path, heading, title] of routes) {
      await page.goto(path, { waitUntil:'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`${path}/?$`));
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByRole('link', { name:'Helios home' })).toHaveAttribute('href', '/');
      await expect(page.getByRole('navigation', { name:'Account access' }).getByRole('link', { name:'Sign in' })).toHaveAttribute('href', '/sign-in');
    }
  });

  test('public information names the confirmed support contact and current processing providers', async ({ page }) => {
    await page.goto('/support', { waitUntil:'domcontentloaded' }); await expect(page.getByRole('link', { name:'hello@helio.works' }).first()).toHaveAttribute('href', 'mailto:hello@helio.works');
    const section = name => page.locator('section').filter({ has: page.getByRole('heading', { name, level:2, exact:true }) });
    const operator = 'Helios is operated by Robert Ormston, trading as Chrysalis Therapy Services.';
    await expect(section('Privacy and data questions')).toContainText(operator);
    await expect(section('Privacy and data questions').getByRole('link', { name:'Privacy Notice' })).toHaveAttribute('href', '/privacy');
    await expect(page.locator('main')).not.toContainText('The final Privacy Notice');
    await page.goto('/privacy', { waitUntil:'domcontentloaded' });
    await expect(section('Service operator')).toContainText(operator);
    for (const provider of ['Supabase', 'Vercel', 'Resend']) await expect(section('Core service providers')).toContainText(provider);
    await expect(page.getByRole('heading', { name:'Google Calendar data', level:2, exact:true })).toBeVisible();
    await expect(section('Optional connected services')).toContainText('Google and Zoom');
    await expect(section('Optional product updates')).toContainText('When marketing is selected and Loops is configured');
    await expect(section('Optional product updates')).toContainText('including an unsubscribed preference when marketing is not selected');
    await expect(section('Traffic and performance telemetry')).toContainText('Vercel Analytics for traffic measurement and Speed Insights for performance measurement');
    await expect(section('Traffic and performance telemetry')).toContainText('removes all query strings and URL fragments');
    await page.goto('/ai-data', { waitUntil:'domcontentloaded' }); await expect(page.locator('section').filter({ has: page.getByRole('heading', { name:'Current provider', level:2, exact:true }) }).getByText('Helios currently uses OpenAI through server-side Helios functions', { exact:false })).toBeVisible(); await expect(page.getByText('not used to train its models by default', { exact:false })).toBeVisible();
    await expect(section('Current provider')).toContainText('requests may include full transcripts, relevant client and session context, therapist-provided notes or guidance');
    await expect(section('AI usage metadata')).toContainText('usage metadata linked to the therapist account');
    await expect(section('Current data handling')).toContainText('does not promise zero retention');
    await page.goto('/cookies', { waitUntil:'domcontentloaded' });
    await expect(section('Traffic and performance telemetry')).toContainText('Vercel Analytics for traffic measurement and Speed Insights for performance measurement');
    await expect(section('Traffic and performance telemetry')).toContainText('removes all query strings and URL fragments');
    await expect(section('Traffic and performance telemetry')).toContainText('replaces client IDs, session IDs and booking tokens');
    await expect(section('Traffic and performance telemetry')).toContainText('Events for unrecognised paths and custom analytics events are excluded');
    await expect(section('Cookies and consent controls')).toContainText('no cookie-consent banner or telemetry consent control');
    await expect(section('Cookies and consent controls')).toContainText('does not claim an exemption from consent requirements');
    await expect(page.locator('main')).not.toContainText('does not include advertising or analytics tracking');
  });

  test('current terms scope Helios to individual therapist accounts', async ({ page }) => {
    await page.goto('/terms', { waitUntil:'domcontentloaded' });
    await expect(page.locator('main')).toContainText('individual therapists operating their own professional practice');
    await expect(page.locator('main')).toContainText('multi-user clinic accounts are not currently supported');
    await expect(page.getByRole('heading', { name:'Testing and beta service' })).toBeVisible();
    const commercial = page.locator('section').filter({ has: page.getByRole('heading', { name:'Launch pricing and billing', exact:true }) });
    await expect(commercial).toContainText('Billing is not yet implemented');
    await expect(commercial).toContainText('Account creation does not currently collect payment or start a paid subscription');
    await expect(commercial).toContainText('trial period and founder-rate eligibility are not currently enforced');
    await expect(commercial).toContainText('will take effect when billing is enabled');

    await page.goto('/privacy', { waitUntil:'domcontentloaded' });
    await expect(page.locator('main')).toContainText('individual therapists using a single account');
    await expect(page.locator('main')).toContainText('does not currently provide organisational, clinic-administrator or shared multi-practitioner accounts');
  });

  test('sign-in has a dedicated route', async ({ page }) => { await page.goto('/sign-in', { waitUntil:'domcontentloaded' }); await expect(page).toHaveTitle('Sign in — Helios'); await expect(page.getByTestId('login-page')).toBeVisible(); await expect(page.getByText('Sign in to your therapist workspace.')).toBeVisible(); await expect(page.getByLabel('Full name')).toHaveCount(0); });

  test('get-started opens account creation with legal information links', async ({ page }) => { await page.goto('/get-started', { waitUntil:'domcontentloaded' }); await expect(page).toHaveTitle('Get started — Helios'); await expect(page.getByTestId('login-page')).toBeVisible(); await expect(page.getByText('Create your therapist workspace.')).toBeVisible(); await expect(page.getByText('Full name')).toBeVisible(); await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms'); await expect(page.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy'); });
});
