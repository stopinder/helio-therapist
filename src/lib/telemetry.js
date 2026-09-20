// Explicitly reviewed router paths. New routes are excluded until reviewed here.
const staticPaths = new Set([
  '/', '/sign-in', '/get-started', '/terms', '/privacy', '/ai-data', '/cookies',
  '/support', '/overview', '/calendar', '/schedule', '/complete', '/clients',
  '/transcripts', '/documents', '/settings', '/supervision',
  '/supervision/reflections', '/supervision/practice-reflection',
  '/supervision/workspace', '/supervision/growth', '/supervision/insights',
])

function routeShape(pathname) {
  const path = pathname.replace(/\/$/, '') || '/'
  if (staticPaths.has(path)) return path
  if (/^\/clients\/[^/]+\/sessions\/[^/]+$/.test(path)) return '/clients/[redacted]/sessions/[redacted]'
  if (/^\/clients\/[^/]+$/.test(path)) return '/clients/[redacted]'
  if (/^\/book\/[^/]+$/.test(path)) return '/book/[redacted]'
  return null
}

// Both installed Vercel SDKs support replacing event.url or returning null.
// Rebuild only their documented fields; never forward queries, fragments or
// an incoming Speed Insights route that could contain identifiers.
export function sanitiseTelemetryEvent(event) {
  if (!event || !['pageview', 'vital'].includes(event.type) || typeof event.url !== 'string') return null
  try {
    const url = new URL(event.url)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const route = routeShape(url.pathname)
    if (!route) return null
    const safeEvent = { type: event.type, url: `${url.origin}${route}` }
    return event.type === 'vital' ? { ...safeEvent, route } : safeEvent
  } catch {
    return null
  }
}
