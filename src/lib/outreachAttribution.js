// Public campaign counts only. No cookies, persisted IDs, identity, URLs or clinical data.
export const OUTREACH_CAMPAIGN = 'helios_uk_launch_202611'
const PUBLIC_PATHS = new Set(['/', '/get-started'])
export function createOutreachAttribution({ location, fetch, randomUUID }) {
  let context = null
  const sent = new Set()
  function capture(event) {
    if (!context || sent.has(event)) return false
    sent.add(event)
    Promise.resolve().then(() => fetch('/api/marketing-events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
      body: JSON.stringify({ event, ...context })
    })).catch(() => {}) // Marketing telemetry must never block navigation or account creation.
    return true
  }
  return {
    route(path) {
      if (!PUBLIC_PATHS.has(path)) return false
      if (!context) {
        const query = new URLSearchParams(location.search)
        if (query.get('utm_source') !== 'apollo' || query.get('utm_medium') !== 'email' || query.get('utm_campaign') !== OUTREACH_CAMPAIGN) return false
        const step = query.get('utm_content')
        if (!['initial', 'followup'].includes(step)) return false
        context = { campaign: OUTREACH_CAMPAIGN, step, visitId: randomUUID() }
      }
      return capture(path === '/' ? 'campaign_landing' : 'campaign_signup_view')
    },
    signupRequest(path) { return path === '/get-started' && capture('campaign_signup_request') }
  }
}
let tracker
export function installOutreachAttribution(router) {
  if (typeof window === 'undefined' || !window.crypto?.randomUUID) return
  tracker = createOutreachAttribution({ location: window.location, fetch: window.fetch.bind(window), randomUUID: () => window.crypto.randomUUID() })
  router.afterEach(to => tracker.route(to.path))
  tracker.route(router.currentRoute.value.path)
}
export function trackOutreachSignupRequest(path) { return tracker?.signupRequest(path) || false }
