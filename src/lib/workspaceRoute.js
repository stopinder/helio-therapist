const NAVIGATION_PATHS = Object.freeze({
  Today: '/today',
  Inbox: '/inbox',
  Clients: '/clients',
  Reflections: '/reflections',
  Settings: '/settings'
})

function cleanSegment(value) {
  return encodeURIComponent(String(value || '').trim())
}

export function buildWorkspaceHash({ nav, clientId, sessionId, transcriptId, reflectionId } = {}) {
  if (transcriptId) return `#/inbox/transcripts/${cleanSegment(transcriptId)}`
  if (reflectionId) return `#/reflections/${cleanSegment(reflectionId)}`
  if (clientId && sessionId) return `#/clients/${cleanSegment(clientId)}/sessions/${cleanSegment(sessionId)}`
  if (clientId) return `#/clients/${cleanSegment(clientId)}`
  return `#${NAVIGATION_PATHS[nav] || NAVIGATION_PATHS.Today}`
}

export function parseWorkspaceHash(hash = '') {
  const path = String(hash || '').replace(/^#/, '').split('?')[0] || '/today'
  const segments = path.split('/').filter(Boolean).map(segment => decodeURIComponent(segment))

  if (segments[0] === 'inbox' && segments[1] === 'transcripts' && segments[2]) {
    return { nav: 'Inbox', transcriptId: segments[2] }
  }
  if (segments[0] === 'reflections' && segments[1]) {
    return { nav: 'Reflections', reflectionId: segments[1] }
  }
  if (segments[0] === 'clients' && segments[1] && segments[2] === 'sessions' && segments[3]) {
    return { nav: 'Client Workspace', clientId: segments[1], sessionId: segments[3] }
  }
  if (segments[0] === 'clients' && segments[1]) {
    return { nav: 'Client Workspace', clientId: segments[1] }
  }

  const nav = Object.entries(NAVIGATION_PATHS).find(([, value]) => value === `/${segments[0] || 'today'}`)?.[0]
  return { nav: nav || 'Today' }
}
