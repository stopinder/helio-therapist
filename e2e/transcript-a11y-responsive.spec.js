import { test, expect } from '@playwright/test';

test.describe('Transcript Workflow - A11y & Responsive', () => {
    const MOCK_EMAIL = 'therapist@example.com';
    const MOCK_PASSWORD = 'password123';
    const MOCK_USER_ID = '11111111-1111-4111-8111-111111111111';

    function base64Url(value) {
        return Buffer.from(JSON.stringify(value)).toString('base64url');
    }

    const now = Math.floor(Date.now() / 1000);
    const MOCK_TOKEN = [
        base64Url({ alg: 'HS256', typ: 'JWT' }),
        base64Url({ aud: 'authenticated', exp: now + 3600, iat: now, sub: MOCK_USER_ID, email: MOCK_EMAIL, role: 'authenticated' }),
        'playwright-signature'
    ].join('.');

    async function ensureWorkspaceLoaded(page) {
        const email = page.getByLabel('Email address');
        const shell = page.getByTestId('workspace-shell');
        await expect(email.or(shell)).toBeVisible({ timeout: 15000 });
        if (await email.isVisible()) {
            await email.fill(MOCK_EMAIL);
            await page.getByLabel('Password').fill(MOCK_PASSWORD);
            await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
        }
        await expect(shell).toBeVisible({ timeout: 15000 });
    }

    async function expectNoHorizontalOverflow(page) {
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    test.beforeEach(async ({ page }) => {
        await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: MOCK_TOKEN, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: MOCK_USER_ID, email: MOCK_EMAIL, role: 'authenticated', aud: 'authenticated' } }) }));
        await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: MOCK_USER_ID, email: MOCK_EMAIL }) }));
        await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: MOCK_USER_ID, full_name: 'Test Therapist', role: 'therapist' }) }));
        await page.route('**/rest/v1/clients*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: MOCK_USER_ID, display_name: 'John Doe', archived: false }]) }));
        await page.route('**/rest/v1/sessions*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
        await page.route('**/rest/v1/therapist_reminders*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
        await page.route('**/api/google/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) }));
        await page.route('**/api/zoom/transcripts*', async route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcripts: [{ id: 'trans-1', meetingId: '123456789', receivedAt: new Date().toISOString(), status: 'unassigned', clientId: null, sessionRef: null, text: 'Mock transcript text content for testing review.' }] }) });
            }
            const body = route.request().postDataJSON();
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: { id: 'trans-1', meetingId: '123456789', receivedAt: new Date().toISOString(), status: body.clientId ? 'assigned' : 'unassigned', clientId: body.clientId || null, sessionRef: body.sessionRef || null, requestedLens: body.requestedLens || null, sourceRetention: body.sourceRetention || 'keep_until_review', reviewChoicesSavedAt: body.reviewChoicesSaved ? new Date().toISOString() : null, text: 'Mock transcript text content for testing review.' } }) });
        });
    });

    for (const viewport of [
        { name: 'Desktop', width: 1280, height: 800 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Mobile', width: 375, height: 667 }
    ]) {
        test(`Responsive Audit - ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/transcripts', { waitUntil: 'domcontentloaded' });
            await ensureWorkspaceLoaded(page);
            await expectNoHorizontalOverflow(page);
            await expect(page.getByRole('heading', { name: 'Transcript Inbox' })).toBeVisible();
            const searchInput = page.getByPlaceholder('Search transcripts');
            await expect(searchInput).toBeVisible();
            const transcriptRow = page.getByRole('button', { name: /Meeting 123456789/ });
            await expect(transcriptRow).toBeVisible();
            await transcriptRow.click();
            await expect(page.getByText('Transcript review')).toBeVisible();
            await expect(page.getByLabel('Client')).toBeVisible();
            await expect(page.getByRole('button', { name: /Assign client/i })).toBeEnabled();
            await expectNoHorizontalOverflow(page);
        });
    }

    test('Accessibility Audit - Keyboard & Focus', async ({ page }) => {
        await page.goto('/transcripts', { waitUntil: 'domcontentloaded' });
        await ensureWorkspaceLoaded(page);
        const searchInput = page.getByPlaceholder('Search transcripts');
        const transcriptRow = page.getByRole('button', { name: /Meeting 123456789/ });
        await searchInput.focus();
        await expect(searchInput).toBeFocused();
        await transcriptRow.focus();
        await expect(transcriptRow).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.getByText('Transcript review')).toBeVisible();
        const backButton = page.getByRole('button', { name: /Transcript Inbox/i });
        await backButton.focus();
        await expect(backButton).toBeFocused();
        const viewRawBtn = page.getByRole('button', { name: /View original transcript/i });
        await expect(viewRawBtn).toBeVisible();
        await viewRawBtn.click();
        await expect(page.locator('pre')).toBeVisible();
    });

    test('Accessibility Audit - Status & Semantic Hierarchy', async ({ page }) => {
        await page.goto('/transcripts', { waitUntil: 'domcontentloaded' });
        await ensureWorkspaceLoaded(page);
        await expect(page.getByRole('heading', { level: 1, name: 'Transcript Inbox' })).toBeVisible();
        await expect(page.getByText('Needs client')).toBeVisible();
        const box = await page.getByPlaceholder('Search transcripts').boundingBox();
        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(40);
    });
});