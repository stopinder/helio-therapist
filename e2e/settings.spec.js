import { test, expect } from '@playwright/test';

test.describe('Settings Workspace Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async () => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  async function mockProfile(page) {
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          full_name: 'Test Therapist',
          professional_title: 'Psychotherapist',
          practice_name: 'Test Practice',
          document_email: 'practice@example.com',
          document_phone: '',
          practice_website: '',
          practice_address: '',
          practice_logo_path: null
        }])
      });
    });
  }

  async function signInAndOpenSettings(page) {
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    const settingsLink = page.locator('aside').getByRole('link', { name: /Settings/i });
    await expect(settingsLink).toBeVisible({ timeout: 15000 });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
  }

  test('renders connections first and launches Google OAuth flow', async ({ page }) => {
    await mockProfile(page);

    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: 'therapist@example.com', last_synced_at: new Date().toISOString() })
      });
    });

    await page.route('**/api/zoom/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
    });

    await signInAndOpenSettings(page);

    const connections = page.getByTestId('settings-connections');
    const practice = page.getByTestId('settings-practice-profile');
    await expect(connections).toBeVisible();
    await expect(practice).toBeVisible();
    await expect(connections.getByText('Google Calendar', { exact: true })).toBeVisible();
    await expect(connections.getByText('Connected', { exact: true })).toBeVisible();
    await expect(connections.getByText('therapist@example.com')).toBeVisible();
    await expect(connections.getByText('Zoom', { exact: true })).toBeVisible();
    await expect(connections.getByText('Not connected', { exact: true })).toBeVisible();
    await expect(practice.getByText('Practice logo', { exact: true })).toBeVisible();
    await expect(practice.getByText('Upload logo', { exact: true })).toBeVisible();

    const connectionBox = await connections.boundingBox();
    const practiceBox = await practice.boundingBox();
    expect(connectionBox).not.toBeNull();
    expect(practiceBox).not.toBeNull();
    expect(connectionBox.y).toBeLessThan(practiceBox.y);

    await page.route('**/api/google/disconnect', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    page.once('dialog', dialog => dialog.accept());
    await connections.getByRole('button', { name: 'Disconnect' }).first().click();

    const connectButton = connections.getByRole('button', { name: 'Connect', exact: true }).first();
    await expect(connectButton).toBeVisible();

    await page.route('**/api/google/authorize', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=1' }) });
    });

    await connectButton.click();
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test('handles Google reconnect required state', async ({ page }) => {
    await mockProfile(page);

    await page.route('**/api/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ connected: true, email: 'therapist@example.com', error: 'GOOGLE_TOKEN_EXPIRED' })
      });
    });

    await page.route('**/api/zoom/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) });
    });

    await signInAndOpenSettings(page);

    const connections = page.getByTestId('settings-connections');
    await expect(connections.getByText('Reconnect Required', { exact: true })).toBeVisible();
    const reconnectButton = connections.getByRole('button', { name: 'Reconnect' });
    await expect(reconnectButton).toBeVisible();

    await page.route('**/api/google/authorize', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=reconnect' }) });
    });

    await reconnectButton.click();
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
