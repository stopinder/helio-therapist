import { test, expect } from '@playwright/test';

test.describe('Authenticated Therapist Workflow', () => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  test.beforeEach(async ({ page }) => {
    if (!email || !password) {
      test.skip(true, 'Skipping authenticated test: PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD are not set.');
    }
  });

  test('should navigate from Clients to Session Workspace', async ({ page }) => {
    // 1. Sign In
    await page.goto('/');
    
    // Fill credentials using accessible labels
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    
    // Click the submit button specifically within the form
    await page.locator('form').getByRole('button', { name: 'Sign in' }).click();

    // Wait for the app to load (AppShell/router-view)
    // We expect to land on Overview or whatever the default is
    await expect(page.locator('header')).toContainText(/Therapist Workspace/i);

    // 2. Open Clients
    // Search for the Clients link in the LeftSidebar
    const clientsLink = page.getByRole('link', { name: /Clients/i });
    await clientsLink.click();

    // Verify at least one real client row appears
    // We look for the "Open client" buttons we tagged with data-testid
    const openClientButtons = page.getByTestId('open-client-button');
    await expect(openClientButtons.first()).toBeVisible({ timeout: 10000 });
    
    const clientCount = await openClientButtons.count();
    expect(clientCount).toBeGreaterThan(0);

    // 3. Open the first client
    const firstClientButton = openClientButtons.first();
    await firstClientButton.click();

    // Verify the URL contains /clients/<uuid>
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // 4. Click Open Session Workspace
    const openSessionButton = page.getByRole('button', { name: /Open Session Workspace/i });
    await expect(openSessionButton).toBeVisible();
    await openSessionButton.click();

    // 5. Verify the URL contains /clients/<uuid>/sessions/<uuid>
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Verify s123 is not present
    expect(page.url()).not.toContain('s123');

    // 6. Verify no Workspace Error is displayed
    const workspaceError = page.getByRole('heading', { name: /Workspace Error/i });
    await expect(workspaceError).not.toBeVisible();
    
    // Verify the session workspace loaded (e.g. check for "Transcript" tab)
    const transcriptTab = page.getByRole('button', { name: /^Transcript$/i });
    await expect(transcriptTab).toBeVisible();

    // 7. Refresh the page
    await page.reload();

    // 8. Verify the Session Workspace still loads
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    await expect(transcriptTab).toBeVisible();
    await expect(workspaceError).not.toBeVisible();

    // 9. Verify simplified workspace (no timer, no listening)
    await expect(page.getByText(/Listening…/i)).not.toBeVisible();
    await expect(page.getByText(/⏱/)).not.toBeVisible();
    await expect(page.getByText(/WORKSPACE ACTIVE/i)).not.toBeVisible();
    await expect(page.getByText(/SESSION IN PROGRESS/i)).toBeVisible();
    await expect(page.getByText(/Session type: In-person/i)).toBeVisible();

    // 10. Work tracking
    await expect(page.getByText(/Work time active/i)).toBeVisible();
    await expect(page.getByText(/Recorded: 0 min/i)).toBeVisible();

    // 10a. Add to Supervision
    const addToSupervisionButton = page.getByRole('button', { name: /Add to Supervision/i });
    await expect(addToSupervisionButton).toBeVisible();
    await addToSupervisionButton.click();

    // Verify modal
    const supervisionHeading = page.getByRole('heading', { name: /Add to Supervision/i });
    await expect(supervisionHeading).toBeVisible();
    await expect(page.getByText(/This creates private supervision material/i)).toBeVisible();

    // Try to save empty
    const saveSupervisionButton = page.locator('div').filter({ hasText: /^Add to Supervision$/ }).locator('..').getByRole('button', { name: 'Add to Supervision' });
    await saveSupervisionButton.click();
    await expect(page.getByText(/Supervision question or note is required/i)).toBeVisible();

    // Fill and save
    await page.getByLabel(/Supervision question or note/i).fill('How to handle countertransference?');
    await page.getByLabel(/Theme/i).fill('Clinical Ethics');
    await page.getByLabel(/Urgency/i).selectOption('soon');
    
    await saveSupervisionButton.click();
    
    // Success message
    await expect(page.getByText(/Added to supervision/i)).toBeVisible();
    
    // Modal should close
    await expect(supervisionHeading).not.toBeVisible({ timeout: 5000 });

    // Pause
    await page.getByTitle('Pause Work').click();
    await expect(page.getByText(/Work paused/i)).toBeVisible();

    // Resume
    await page.getByTitle('Resume Work').click();
    await expect(page.getByText(/Work time active/i)).toBeVisible();

    // 11. End Session
    const endSessionButton = page.getByRole('button', { name: /End Session/i });
    await expect(endSessionButton).toBeVisible();
    await endSessionButton.click();

    // 11a. Verify confirmation dialog
    const confirmHeading = page.getByRole('heading', { name: /End this client session\?/i });
    await expect(confirmHeading).toBeVisible();
    
    // Cancel first
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(confirmHeading).not.toBeVisible();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    
    // Now confirm
    await endSessionButton.click();
    await page.locator('div').filter({ hasText: /^End this client session\?$/ }).locator('..').getByRole('button', { name: 'End Session' }).click();

    // 11b. Verify Billing Confirmation dialog
    const billingHeading = page.getByRole('heading', { name: /Confirm Billable Time/i });
    await expect(billingHeading).toBeVisible();
    await expect(page.getByText(/Recorded work time/i)).toBeVisible();

    // Confirm billing (defaults to recorded)
    await page.getByRole('button', { name: /Confirm Billable Time/i }).click();

    // 12. Verify navigation back to client record after completion
    await expect(page).toHaveURL(/\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // 13. Verify session-completed timeline event
    await expect(page.getByText(/Session completed/i)).toBeVisible();
  });
});
