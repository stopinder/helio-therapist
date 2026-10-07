import { defineConfig, devices } from '@playwright/test'

// Synthetic account and mocked services only; never contacts the live project.
export default defineConfig({
  testDir: './e2e', testMatch: 'stance-question-bank.spec.js',
  workers: 1, retries: 0, timeout: 60000, globalTimeout: 300000,
  reporter: 'list', outputDir: 'test-results/stance',
  use: { baseURL: 'http://127.0.0.1:5190', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'stance-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'stance-mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5190 --strictPort',
    url: 'http://127.0.0.1:5190', reuseExistingServer: false, timeout: 60000,
    env: { VITE_SUPABASE_URL: 'https://stance-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'fictional-stance-test-anon-key' }
  }
})
