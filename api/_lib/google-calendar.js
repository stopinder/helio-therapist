export class GoogleCalendarAuthError extends Error {
  constructor(message = 'Google Calendar needs permission again') {
    super(message)
    this.name = 'GoogleCalendarAuthError'
    this.code = 'GOOGLE_REAUTH_REQUIRED'
    this.status = 403
  }
}

function googleConfiguration() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) {
    const error = new Error('Google Calendar is not configured')
    error.code = 'GOOGLE_CONFIGURATION_ERROR'
    error.status = 500
    throw error
  }
  return { clientId, clientSecret }
}

export async function refreshGoogleAccessToken({ supabase, userId, integration, fetchImpl = fetch }) {
  if (!integration?.refresh_token) {
    throw new GoogleCalendarAuthError()
  }

  const { clientId, clientSecret } = googleConfiguration()
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token'
    })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) {
    console.warn('[Google Calendar] Refresh requires new consent:', payload.error || response.status)
    throw new GoogleCalendarAuthError(payload.error_description || 'Google Calendar needs permission again')
  }

  const updated = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || integration.refresh_token,
    token_type: payload.token_type || integration.token_type || null,
    scope: payload.scope || integration.scope || null,
    expires_at: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : integration.expires_at || null,
    updated_at: new Date().toISOString()
  }
  const { error } = await supabase.from('integrations').update(updated)
    .eq('provider', 'google').eq('user_id', userId)
  if (error) throw new Error(`Unable to save refreshed Google Calendar access: ${error.message}`)
  return { ...integration, ...updated }
}

export async function fetchGoogleCalendarEvents({ supabase, userId, integration, start, end, fetchImpl = fetch }) {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    const error = new Error('Invalid calendar date range')
    error.status = 400
    throw error
  }

  if (!integration?.access_token) throw new GoogleCalendarAuthError()
  let activeIntegration = integration

  const requestWithAuth = async (url) => {
    let response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${activeIntegration.access_token}` }
    })
    if (response.status === 401) {
      activeIntegration = await refreshGoogleAccessToken({ supabase, userId, integration: activeIntegration, fetchImpl })
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${activeIntegration.access_token}` }
      })
    }
    return response
  }

  // 1. Get all calendars the user has access to
  const listResponse = await requestWithAuth('https://www.googleapis.com/calendar/v3/users/me/calendarList')
  if (!listResponse.ok) {
    const body = await listResponse.json().catch(() => ({}))
    const error = new Error(body.error?.message || 'Could not list Google Calendars')
    error.status = listResponse.status
    throw error
  }
  const listData = await listResponse.json()
  const calendars = listData.items || [{ id: 'primary' }]

  // 2. Fetch events for each calendar
  const allEvents = []
  for (const calendar of calendars) {
    let pageToken = null
    do {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250'
      })
      if (pageToken) params.append('pageToken', pageToken)

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`
      const response = await requestWithAuth(url)

      if (!response.ok) {
        // Skip calendars we can't read, but log if it's not a 403/404
        if (![403, 404].includes(response.status)) {
          console.warn(`[Google Calendar] Could not fetch events for ${calendar.id}:`, response.status)
        }
        break
      }

      const data = await response.json()
      if (data.items) {
        allEvents.push(...data.items)
      }
      pageToken = data.nextPageToken
    } while (pageToken)
  }

  return { items: allEvents, integration: activeIntegration }
}

export async function recordGoogleCalendarSync({ supabase, userId }) {
  const syncedAt = new Date().toISOString()
  const { error } = await supabase.from('integrations').update({ last_synced_at: syncedAt, updated_at: syncedAt })
    .eq('provider', 'google').eq('user_id', userId)
  if (error) console.warn('[Google Calendar] Could not record sync time:', error.message)
  return syncedAt
}
