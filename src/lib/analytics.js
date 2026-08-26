const CONSENT_KEY = 'helios_analytics_consent'
const VISITOR_KEY = 'helios_analytics_visitor_id'

const SAFE_PUBLIC_PATHS = new Set([
  '/',
  '/privacy',
  '/terms',
  '/ai-data',
  '/cookies',
  '/support',
  '/sign-in',
  '/get-started'
])

// PostHog project tokens are public ingestion identifiers, not secret API credentials.
const posthogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_CPqQxDJeFyQKRAWz2MoW6Sggk7uaEo9jVbNC5X5enP3j'
const posthogHost = (import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(/\/$/, '')

export function getAnalyticsConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'granted' ? true : value === 'denied' ? false : null
  } catch {
    return null
  }
}

export function setAnalyticsConsent(granted) {
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied')
    if (!granted) window.localStorage.removeItem(VISITOR_KEY)
  } catch {
    // Consent remains session-only if browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent('helios-analytics-consent', { detail: { granted } }))
}

export function isAnalyticsPathAllowed(path) {
  return SAFE_PUBLIC_PATHS.has(path)
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.localStorage.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

export function captureAnalyticsEvent(event, properties = {}) {
  if (getAnalyticsConsent() !== true) return false

  const payload = {
    api_key: posthogKey,
    event,
    properties: {
      distinct_id: getVisitorId(),
      ...properties
    }
  }

  fetch(`${posthogHost}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {})

  return true
}

export function capturePublicPageView(route) {
  const path = route?.path || ''
  if (!isAnalyticsPathAllowed(path)) return false

  return captureAnalyticsEvent('$pageview', {
    $current_url: `${window.location.origin}${path}`,
    path,
    page_name: route?.name ? String(route.name) : undefined
  })
}

export function installPublicCtaTracking() {
  const handler = (event) => {
    const signupLink = event.target?.closest?.('a[href="/get-started"]')
    if (signupLink && window.location.pathname === '/') {
      captureAnalyticsEvent('landing_cta_clicked', { source: 'landing' })
      return
    }

    const signupButton = event.target?.closest?.('button[type="submit"]')
    if (signupButton && window.location.pathname === '/get-started') {
      captureAnalyticsEvent('signup_started', { source: 'get_started' })
    }
  }

  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}
