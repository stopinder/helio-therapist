// Explicit capture API only: no SDK, autocapture, replay, cookies or identity.
// https://posthog.com/docs/api/capture
const campaignTags = {
  utm_source: new Set(['apollo']),
  utm_medium: new Set(['email']),
  utm_campaign: new Set(['helios_test', 'helios_uk_launch_202611']),
}

export function landingProperties(location) {
  if (location.pathname !== '/') return null
  const properties = { $pathname: '/', $process_person_profile: false, $geoip_disable: true }
  const params = new URLSearchParams(location.search)
  for (const [key, values] of Object.entries(campaignTags)) {
    const candidates = params.getAll(key)
    if (candidates.length === 1 && values.has(candidates[0])) properties[key] = candidates[0]
  }
  return properties
}

export function createLandingPageCapture({ token, host, fetch: send, randomUUID }) {
  let captured = false
  return function capture(location) {
    const properties = landingProperties(location)
    if (captured || !properties || !token || !host) return
    let endpoint
    try {
      endpoint = new URL(host)
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return
      endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/i/v0/e/`
      // One ephemeral transport ID; never stored or linked to a user.
      const body = JSON.stringify({ api_key: token, event: '$pageview', distinct_id: randomUUID(), properties })
      captured = true
      // No retries or deferred tracking after the visitor leaves the landing page.
      void send(endpoint.href, {
        method: 'POST', body, headers: { 'Content-Type': 'text/plain' },
        credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
      }).catch(() => {})
    } catch {
      // Telemetry must never interrupt the public page.
    }
  }
}

const capture = createLandingPageCapture({
  token: import.meta.env?.VITE_POSTHOG_PROJECT_TOKEN,
  host: import.meta.env?.VITE_POSTHOG_HOST,
  fetch: (...args) => window.fetch(...args),
  randomUUID: () => window.crypto.randomUUID(),
})

// Module lifetime deduplicates remounts, hash/query changes and SPA returns.
// A new document visit gets one new anonymous pageview.
export function captureLandingPageView() {
  capture(window.location)
}
