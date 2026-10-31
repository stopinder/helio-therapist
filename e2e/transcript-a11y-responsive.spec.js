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

    async function ensureWorkspaceLoaded(page, targetPath = '/transcripts') {
        const email = page.getByLabel('Email address');
        const shell = page.getByTestId('workspace-shell');
        await expect(email.or(shell)).toBeVisible({ timeout: 15000 });
        if (await email.isVisible()) {
            await email.fill(MOCK_EMAIL);
            await page.getByLabel('Password').fill(MOCK_PASSWORD);
            await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
            await expect(shell).toBeVisible({ timeout: 15000 });
            await page.goto(targetPath, { waitUntil: 'domcontentloaded' });
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
        await page.route('**/api/billing/status*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasWorkspaceAccess: true, subscription: { status: 'trialing' } }) }));
        const transcriptDetail = {
            id: 'trans-1',
            meetingId: '123456789',
            sourceTitle: 'Mock session',
            receivedAt: new Date().toISOString(),
            sourceOccurredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'unassigned',
            clientId: null,
            sessionRef: null,
            requestedLens: null,
            sourceRetention: 'keep_until_review',
            reviewChoicesSavedAt: null,
            completedAt: null,
            attentionClearedAt: null,
            structuredTranscript: {
                speakers: [{ id: '1', display_name: 'Therapist' }]
            },
            text: 'Mock transcript text content for testing review.'
        };
        await page.route('**/api/zoom/transcripts*', async route => {
            if (route.request().method() === 'GET') {
                const url = new URL(route.request().url());
                const payload = url.searchParams.get('id')
                    ? { transcript: transcriptDetail }
                    : { transcripts: [{ ...transcriptDetail, structuredTranscript: null, text: null }] };
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
            }
            const body = route.request().postDataJSON();
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    transcript: {
                        ...transcriptDetail,
                        status: body.clientId ? 'assigned' : 'unassigned',
                        clientId: body.clientId || null,
                        sessionRef: body.clientId ? 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' : null,
                        requestedLens: body.requestedLens || null,
                        sourceRetention: body.sourceRetention || 'keep_until_review',
                        reviewChoicesSavedAt: body.reviewChoicesSaved ? new Date().toISOString() : null,
                        attentionClearedAt: body.clearAttention ? new Date().toISOString() : null
                    }
                })
            });
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
            await expect(page.getByRole('heading', { level: 1, name: 'Transcript Inbox' })).toBeVisible();
            const searchInput = page.getByPlaceholder('Search transcripts');
            await expect(searchInput).toBeVisible();
            const transcriptRow = page.locator('[data-transcript-id="trans-1"]');
            await expect(transcriptRow).toBeVisible();
            await expect(transcriptRow).toContainText('Meeting 123456789');
            await expect(transcriptRow).toContainText('Needs client');
            const clientSelect = transcriptRow.getByRole('combobox');
            await expect(clientSelect).toBeVisible();
            await clientSelect.selectOption({ label: 'John Doe' });
            await expect(transcriptRow.getByRole('button', { name: 'Assign' })).toBeEnabled();

            await transcriptRow.getByRole('button', { name: 'Open full transcript' }).click();
            await expect(page.getByText('Transcript review')).toBeVisible();
            await expect(page.getByRole('button', { name: /Raw source/i })).toBeVisible();
            await expect(page.getByPlaceholder('Search this transcript')).toBeVisible();
            await expectNoHorizontalOverflow(page);
        });
    }

    test('Accessibility Audit - Keyboard & Focus', async ({ page }) => {
        await page.goto('/transcripts', { waitUntil: 'domcontentloaded' });
        await ensureWorkspaceLoaded(page);
        const searchInput = page.getByPlaceholder('Search transcripts');
        const transcriptRow = page.locator('[data-transcript-id="trans-1"]');
        const clientSelect = transcriptRow.getByRole('combobox');
        const openButton = transcriptRow.getByRole('button', { name: 'Open full transcript' });

        await searchInput.focus();
        await expect(searchInput).toBeFocused();
        await clientSelect.focus();
        await expect(clientSelect).toBeFocused();
        await openButton.focus();
        await expect(openButton).toBeFocused();
        await page.keyboard.press('Enter');

        await expect(page.getByText('Transcript review')).toBeVisible();
        const backButton = page.getByRole('button', { name: /Transcript Inbox/i });
        await backButton.focus();
        await expect(backButton).toBeFocused();
        const viewRawBtn = page.getByRole('button', { name: /Raw source/i });
        await expect(viewRawBtn).toBeVisible();
        await viewRawBtn.focus();
        await expect(viewRawBtn).toBeFocused();
        await page.keyboard.press('Enter');
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
