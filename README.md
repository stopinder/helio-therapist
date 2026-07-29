# Helios Therapist Workspace

## End-to-End Testing with Playwright

We use Playwright to automate core therapist workflows.

### Installation

1. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

### Running Tests

#### Local Development
By default, tests run against a local Vite server (`http://localhost:5173`) which is automatically started.

1. Create a local environment file for e2e tests (ignored by git):
   ```bash
   cp .env.e2e.example .env.e2e.local
   ```
   Fill in `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` with valid therapist credentials.

2. Run tests:
   ```bash
   npm run test:e2e
   ```

#### Testing a Deployed Site (e.g., Vercel)
You can run tests against a deployed URL by setting the `PLAYWRIGHT_BASE_URL` environment variable. In this mode, the local dev server is NOT started.

```bash
# Windows PowerShell
$env:PLAYWRIGHT_BASE_URL="https://your-deployed-site.vercel.app"; npm run test:e2e

# Linux/macOS
PLAYWRIGHT_BASE_URL=https://your-deployed-site.vercel.app npm run test:e2e
```

### Other Test Commands

- Run tests in headed mode (visible browser):
  ```bash
  npm run test:e2e:headed
  ```

- Open Playwright UI (interactive mode):
  ```bash
  npm run test:e2e:ui
  ```

- View test report:
  ```bash
  npm run test:e2e:report
  ```

### Important Notes

- Authenticated tests will be skipped if `PLAYWRIGHT_TEST_EMAIL` or `PLAYWRIGHT_TEST_PASSWORD` are not set in the environment.
- Tests may create or resume a real "in-progress" session for the test client in the database.
- Screenshots and traces are captured automatically upon test failure.
