import { test, expect } from '@playwright/test';

test.describe('Client Details', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should edit client details and verify persistence', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    // 2. Open Clients page
    await page.getByRole('link', { name: /Clients/i }).click();
    await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();

    // 3. Create a test client if none exists or just use an existing one
    // For reliability in CI, we create one
    await page.getByRole('button', { name: '+ Add Client' }).click();
    const clientName = `Details Test ${Date.now()}`;
    await page.getByPlaceholder('Client name').fill(clientName);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10000 });

    // 4. Open the client workspace
    // Find the row with our client and click "Open client"
    const row = page.locator('tr').filter({ hasText: clientName });
    await row.getByTestId('open-client-button').click();
    await expect(page.getByRole('heading', { name: clientName })).toBeVisible();

    // 5. Navigate to Details tab
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('heading', { name: 'Client Details' })).toBeVisible();

    // 6. Fill in details
    const details = {
      preferredName: 'Tester',
      phone: '123-456-7890',
      email: 'tester@example.com',
      address: '123 Test Lane, Test City',
      gp: 'Dr. Test, Test Clinic',
      emergency: 'Emergency Contact, 911',
      notes: 'This is a test note for clinical administration.'
    };

    await page.getByPlaceholder('How they like to be called').fill(details.preferredName);
    await page.getByPlaceholder('Phone number').fill(details.phone);
    await page.getByPlaceholder('Email address').fill(details.email);
    await page.getByPlaceholder('Residential address').fill(details.address);
    await page.getByPlaceholder('GP name, clinic, and contact info').fill(details.gp);
    await page.getByPlaceholder('Name, relationship, and phone').fill(details.emergency);
    await page.getByPlaceholder('Administrative or general clinical notes').fill(details.notes);

    // 7. Save changes
    await page.getByRole('button', { name: 'Save Changes' }).first().click();
    await expect(page.getByText('Changes saved successfully.')).toBeVisible();

    // 8. Reload and verify
    await page.reload();
    await page.getByRole('button', { name: 'Details' }).click();
    
    await expect(page.getByPlaceholder('How they like to be called')).toHaveValue(details.preferredName);
    await expect(page.getByPlaceholder('Phone number')).toHaveValue(details.phone);
    await expect(page.getByPlaceholder('Email address')).toHaveValue(details.email);
    await expect(page.getByPlaceholder('Residential address')).toHaveValue(details.address);
    await expect(page.getByPlaceholder('GP name, clinic, and contact info')).toHaveValue(details.gp);
    await expect(page.getByPlaceholder('Name, relationship, and phone')).toHaveValue(details.emergency);
    await expect(page.getByPlaceholder('Administrative or general clinical notes')).toHaveValue(details.notes);
  });
});
