import { defineConfig, devices } from '@playwright/test'
// Fictional, localhost-only UI acceptance. No live account, clinical data or AI calls.
export default defineConfig({
  testDir: './e2e', testMatch: ['document-preparation.spec.js', 'working-formulation.spec.js'],
  fullyParallel: false, workers: 1, retries: 0, timeout: 45000, globalTimeout: 180000,
  reporter: 'list', outputDir: 'test-results/documents',
  use: { baseURL: 'http://127.0.0.1:5194', trace: 'retain-on-failure' },
  projects: [{ name: 'documents-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5194 --strictPort',
    url: 'http://127.0.0.1:5194', reuseExistingServer: false, timeout: 60000,
    env: { VITE_SUPABASE_URL: 'https://document-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'fictional-documents-test-key' }
  }
})
