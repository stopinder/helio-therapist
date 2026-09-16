import { test, expect } from '@playwright/test';

test.describe('Care reflection workflow', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const email = 'therapist@example.com';
    const password = 'password123';

    function base64Url(value) {
        return Buffer.from(JSON.stringify(value)).toString('base64url');
    }

    const now = Math.floor(Date.now() / 1000);
    const mockToken = [
        base64Url({ alg:'HS256', typ:'JWT' }),
        base64Url({
            aud:'authenticated',
            exp:now + 3600,
            iat:now,
            sub:userId,
            email,
            role:'authenticated'
        }),
        'playwright-signature'
    ].join('.');

    test('therapist can open reflection, generate suggestions and save them', async ({ page }) => {
        let careInsert = null;
        let suggestionsGenerated = false;

        // Auth mocks
        await page.route('**/auth/v1/token*', route =>
            route.fulfill({
                status:200,
                contentType:'application/json',
                body:JSON.stringify({
                    access_token:mockToken,
                    refresh_token:'mock-refresh-token',
                    token_type:'bearer',
                    expires_in:3600,
                    user:{
                        id:userId,
                        email,
                        role:'authenticated',
                        aud:'authenticated',
                        user_metadata:{ full_name:'Test Therapist' }
                    }
                })
            })
        );

        await page.route('**/auth/v1/user', route =>
            route.fulfill({
                status:200,
                contentType:'application/json',
                body:JSON.stringify({
                    id:userId,
                    email,
                    user_metadata:{ full_name:'Test Therapist' }
                })
            })
        );

        // API mocks
        await page.route('**/api/ai/care-suggestions', route => {
            suggestionsGenerated = true;

            return route.fulfill({
                status:200,
                contentType:'application/json',
                body:JSON.stringify({
                    success:true,
                    suggestions:[
                        {
                            id:'suggestion-1',
                            kind:'trying',
                            body:'A possible next step for the client.',
                            basis:'therapist_input',
                            epistemic:'possible_next_step',
                            action:'add',
                            targetItemId:null,
                            promptVersion:'care-suggestions-v4'
                        }
                    ]
                })
            });
        });

        await page.route('**/rest/v1/**', async route => {
            const request = route.request();
            const url = new URL(request.url());
            const table = url.pathname.split('/').pop();

            const json = body =>
                route.fulfill({
                    status:200,
                    contentType:'application/json',
                    body:JSON.stringify(body)
                });

            if (table === 'profiles') {
                return json({
                    id:userId,
                    full_name:'Test Therapist',
                    role:'therapist'
                });
            }

            if (table === 'therapist_reminders') {
                return json([]);
            }

            if (table === 'clients') {
                if (url.searchParams.get('id') === `eq.${clientId}`) {
                    return json({
                        id:clientId,
                        user_id:userId,
                        display_name:'Test Client',
                        reference:'test-ref',
                        archived:false
                    });
                }

                return json([]);
            }

            if (table === 'client_care_items') {
                if (request.method() === 'POST') {
                    careInsert = request.postDataJSON();

                    return json({
                        id:'ffffffff-ffff-4fff-8fff-ffffffffffff',
                        ...careInsert,
                        status:'current'
                    });
                }

                return json([]);
            }

            return json([]);
        });

        const carePath = `/clients/${clientId}?tab=Care`;

        await page.goto(carePath);

        // Login if needed
        const loginEmail = page.getByLabel('Email address');

        if (await loginEmail.isVisible()) {
            await loginEmail.fill(email);
            await page.getByLabel('Password').fill(password);

            await page.locator('form').getByRole('button', {
                name:'Sign in'
            }).click();

            // Sign-in redirects to Today, so return to the Care page.
            await page.goto(carePath);
        }

        await expect(page).toHaveURL(
            new RegExp(`/clients/${clientId}\\?tab=Care`)
        );

        // Open reflection
        await page.getByRole('button', {
            name:/Reflect on Care/i
        }).click();

        await expect(
            page.getByTestId('care-reflection-panel')
        ).toBeVisible();

        // Generate suggestions
        await page
            .getByRole('textbox', { name: /Type here, or use the microphone to dictate/i })
            .fill('Client showed progress in emotional regulation.');
        await page.getByRole('button', {
            name:'Generate suggestions'
        }).click();

        await expect.poll(() => suggestionsGenerated).toBe(true);

        // Review and save
        await expect(
            page.getByText('A possible next step for the client.')
        ).toBeVisible();

        await page.getByRole('button', {
            name:'Accept'
        }).click();

        await page.getByRole('button', {
            name:'Save 1 accepted change'
        }).click();

        await expect.poll(() => careInsert).not.toBeNull();

        expect(careInsert).toMatchObject({
            client_id:clientId,
            kind:'trying',
            body:'A possible next step for the client.',
            origin:'ai_assisted'
        });
    });
});