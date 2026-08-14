import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// Safeguard against orphaned/runaway E2E processes (a runaway process previously
// remained active for >24 hours and repeatedly exercised session lifecycle operations).
if (baseURL && !baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')) {
  if (process.env.ALLOW_REMOTE_PLAYWRIGHT !== '1') {
    console.error(`\n❌ ERROR: Remote Playwright execution blocked!`);
    console.error(`PLAYWRIGHT_BASE_URL is set to a remote address (${baseURL}).`);
    console.error(`To prevent runaway remote test suites, you must explicitly set ALLOW_REMOTE_PLAYWRIGHT=1\n`);
    process.exit(1);
  }
}

export default defineConfig({
  timeout: 60_000,
  globalTimeout: 600_000,
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
