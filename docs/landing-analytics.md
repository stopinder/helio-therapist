# Landing campaign analytics

`Landing.vue` calls `captureLandingPageView` on mount. It uses PostHog's
[capture API](https://posthog.com/docs/api/capture), with the existing
`VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` build variables.
There is no SDK initialization, autocapture, replay, person profile, persistent
visitor identifier, route listener, or background event collection.

Each document lifetime sends at most one `$pageview`, only while the homepage
is mounted at `/`. Remounts, hash changes and SPA returns do not duplicate it.
Reloads and new document visits count again. This counts page visits, not unique
people. Missing configuration or blocked requests fail silently without retries.

Event properties are `$pathname: /` and exact allowlisted campaign values:

- `utm_source=apollo`
- `utm_medium=email`
- `utm_campaign=helios_uk_launch_202611` or `helios_test`

Unknown or duplicate values are dropped, as are all other query parameters and
fragments. New campaigns or other UTM values require an explicit allowlist edit.
The request suppresses the HTTP referrer and credentials. It sends a fresh random
transport ID required by PostHog, disables person processing and GeoIP, and sends
no page URL, referrer, browser metadata, account identity or clinical information.
PostHog receives the network request itself. Vercel Analytics and Google Ads are
unchanged and have their own behavior.

Verification:

```sh
node --test test/landing-analytics.test.js
npx playwright test --config playwright.landing.config.js
npm run build
```

The browser suite uses synthetic authentication and intercepts analytics; it
does not send test fixtures to PostHog. After deployment, visit
`https://helio.works/?utm_source=apollo&utm_medium=email&utm_campaign=helios_test`
once, then verify the exact anonymous event in the project matching the deployed
token. A successful HTTP response alone does not prove ingestion.
