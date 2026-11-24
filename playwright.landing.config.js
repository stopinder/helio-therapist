import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'landing-analytics.spec.js',
  timeout: 30000, globalTimeout: 90000, workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5186' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5186 --strictPort',
    url: 'http://127.0.0.1:5186', reuseExistingServer: false,
    env: { VITE_POSTHOG_PROJECT_TOKEN: 'test-only', VITE_POSTHOG_HOST: 'https://capture.example.com',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
})
