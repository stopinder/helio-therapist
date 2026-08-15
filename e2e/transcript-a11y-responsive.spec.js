import { test, expect } from '@playwright/test';

// TODO: enable after authenticated Playwright fixture/test account is established.
test.describe.skip('Transcript Workflow - A11y & Responsive', () => {
    const MOCK_EMAIL = 'therapist@example.com';
    const MOCK_PASSWORD = 'password123';
    const MOCK_USER_ID = 'mock-user-id';

    function base64Url(value) {
        return Buffer.from(JSON.stringify(value)).toString('base64url');
    }

    const now = Math.floor(Date.now() / 1000);
    const MOCK_TOKEN = [
        base64Url({ alg: 'HS256', typ: 'JWT' }),
        base64Url({
            aud: 'authenticated',
            exp: now + 3600,
            iat: now,
            sub: MOCK_USER_ID,
            email: MOCK_EMAIL,
            role: 'authenticated'
        }),
        'playwright-signature'
    ].join('.');

    async function performLogin(page) {
        const email = page.getByLabel('Email address');

        if (await email.isVisible()) {
            await email.fill(MOCK_EMAIL);
            await page.getByLabel('Password').fill(MOCK_PASSWORD);
            await page.getByRole('button', { name: 'Sign in' }).click();
        }
    }

    async function ensureWorkspaceLoaded(page) {
        await performLogin(page);
        await expect(page.getByTestId('workspace-shell')).toBeVisible({
            timeout: 15000
        });
    }

    async function openTranscriptReview(page) {
        const transcriptRow = page.getByRole('button', {
            name: /Meeting 123456789/
        });

        await expect(transcriptRow).toBeVisible();
        await transcriptRow.click();

        await expect(
            page.getByRole('heading', { name: /Transcript review/i })
                .or(page.getByText('Transcript review'))
        ).toBeVisible();
    }

    async function expectNoHorizontalOverflow(page) {
        await expect
            .poll(async () => {
                return page.evaluate(() =>
                    document.documentElement.scrollWidth <= window.innerWidth
                );
            })
            .toBe(true);
    }

    test.beforeEach(async ({ page }) => {
        await page.route('**/auth/v1/token*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: MOCK_TOKEN,
                    refresh_token: 'mock-refresh-token',
                    token_type: 'bearer',
                    expires_in: 3600,
                    user: {
                        id: MOCK_USER_ID,
                        email: MOCK_EMAIL,
                        role: 'authenticated',
                        aud: 'authenticated'
                    }
                })
            });
        });

        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: MOCK_USER_ID,
                    email: MOCK_EMAIL
                })
            });
        });

        await page.route('**/rest/v1/profiles*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: MOCK_USER_ID,
                        full_name: 'Robert Ormiston',
                        role: 'therapist'
                    }
                ])
            });
        });

        await page.route('**/rest/v1/clients*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'client-1',
                        user_id: MOCK_USER_ID,
                        display_name: 'John Doe',
                        archived: false
                    }
                ])
            });
        });

        await page.route('**/rest/v1/sessions*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'session-101',
                        client_id: 'client-1',
                        occurred_at: new Date().toISOString(),
                        status: 'completed'
                    }
                ])
            });
        });

        await page.route('**/api/zoom/transcripts*', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        transcripts: [
                            {
                                id: 'trans-1',
                                meetingId: '123456789',
                                receivedAt: new Date().toISOString(),
                                status: 'unassigned',
                                clientId: null,
                                sessionRef: null,
                                text: 'Mock transcript text content for testing review.'
                            }
                        ]
                    })
                });
                return;
            }

            if (route.request().method() === 'PATCH') {
                const body = JSON.parse(route.request().postData() || '{}');

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        transcript: {
                            id: 'trans-1',
                            meetingId: '123456789',
                            receivedAt: new Date().toISOString(),
                            status: body.clientId ? 'assigned' : 'unassigned',
                            clientId: body.clientId || null,
                            sessionRef: body.sessionRef || null,
                            requestedLens: body.requestedLens || null,
                            sourceRetention:
                                body.sourceRetention || 'keep_until_review',
                            reviewChoicesSavedAt: body.reviewChoicesSaved
                                ? new Date().toISOString()
                                : null,
                            text: 'Mock transcript text content for testing review.'
                        }
                    })
                });
            }
        });

        await page.route('**/api/google/status', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ connected: true })
            });
        });
    });

    const viewports = [
        { name: 'Desktop', width: 1280, height: 800 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
        test(`Responsive Audit - ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height
            });

            await page.goto('/transcripts', {
                waitUntil: 'domcontentloaded'
            });

            await ensureWorkspaceLoaded(page);

            await expectNoHorizontalOverflow(page);

            await expect(
                page.getByRole('heading', { name: 'Transcript Inbox' })
            ).toBeVisible();

            const searchInput = page.getByPlaceholder('Search transcripts');
            await expect(searchInput).toBeVisible();

            const transcriptRow = page.getByRole('button', {
                name: /Meeting 123456789/
            });

            await expect(transcriptRow).toBeVisible();
            await transcriptRow.click();

            await expect(
                page.getByRole('heading', { name: /Transcript review/i })
                    .or(page.getByText('Transcript review'))
            ).toBeVisible();

            await expect(
                page.getByRole('heading', { name: 'Client' })
                    .or(page.getByText('Client', { exact: true }))
            ).toBeVisible();

            const clientControl = page.getByLabel('Client');
            await expect(clientControl).toBeVisible();

            const assignButton = page.getByRole('button', {
                name: /Assign client/i
            });

            await expect(assignButton).toBeVisible();
            await expect(assignButton).toBeEnabled();

            await expectNoHorizontalOverflow(page);
        });
    }

    test('Accessibility Audit - Keyboard & Focus', async ({ page }) => {
        await page.goto('/transcripts', {
            waitUntil: 'domcontentloaded'
        });

        await ensureWorkspaceLoaded(page);

        const searchInput = page.getByPlaceholder('Search transcripts');
        const transcriptRow = page.getByRole('button', {
            name: /Meeting 123456789/
        });

        await searchInput.focus();
        await expect(searchInput).toBeFocused();

        await transcriptRow.focus();
        await expect(transcriptRow).toBeFocused();

        await page.keyboard.press('Enter');

        await expect(
            page.getByRole('heading', { name: /Transcript review/i })
                .or(page.getByText('Transcript review'))
        ).toBeVisible();

        const backButton = page.getByRole('button', {
            name: /Transcript Inbox/i
        });

        await expect(backButton).toBeVisible();

        await backButton.focus();
        await expect(backButton).toBeFocused();

        const progress = page.getByRole('list', {
            name: /Transcript review progress/i
        });

        if (await progress.count()) {
            await expect(progress).toBeVisible();
        }

        const transcriptViews = page.getByRole('group', {
            name: /Transcript views/i
        });

        if (await transcriptViews.count()) {
            await expect(transcriptViews).toBeVisible();
        }

        const viewRawBtn = page.getByRole('button', {
            name: /View original transcript/i
        });

        await expect(viewRawBtn).toBeVisible();

        const expanded = await viewRawBtn.getAttribute('aria-expanded');

        if (expanded !== null) {
            await expect(viewRawBtn).toHaveAttribute(
                'aria-expanded',
                'false'
            );
        }

        await viewRawBtn.click();

        if (expanded !== null) {
            await expect(viewRawBtn).toHaveAttribute(
                'aria-expanded',
                'true'
            );
        }

        await expect(page.locator('pre')).toBeVisible();
    });

    test('Accessibility Audit - Status & Semantic Hierarchy', async ({ page }) => {
        await page.goto('/transcripts', {
            waitUntil: 'domcontentloaded'
        });

        await ensureWorkspaceLoaded(page);

        await expect(
            page.getByRole('heading', {
                level: 1,
                name: 'Transcript Inbox'
            })
        ).toBeVisible();

        await expect(page.getByText('Needs client')).toBeVisible();

        const searchInput = page.getByPlaceholder('Search transcripts');
        const box = await searchInput.boundingBox();

        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(40);
    });
});