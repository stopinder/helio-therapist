import { defineConfig, devices } from '@playwright/test'
// Isolated localhost-only test server. Never uses a real account or database.
export default defineConfig({
  testDir: './e2e', testMatch: 'help-centre.spec.js',
  fullyParallel: false, workers: 1, retries: 0, timeout: 30000, globalTimeout: 180000,
  reporter: 'list', outputDir: 'test-results/help',
  use: { baseURL: 'http://127.0.0.1:5189', trace: 'retain-on-failure' },
  projects: [{ name: 'help-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5189 --strictPort',
    url: 'http://127.0.0.1:5189', reuseExistingServer: false, timeout: 60000,
    env: { VITE_SUPABASE_URL: 'https://help-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'fictional-help-test-anon-key' }
  }
})
