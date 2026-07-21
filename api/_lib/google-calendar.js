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
  const requestEvents = async (accessToken) => {
    const params = new URLSearchParams({
      timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true',
      orderBy: 'startTime', maxResults: '500'
    })
    return fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  }

  if (!integration?.access_token) throw new GoogleCalendarAuthError()
  let activeIntegration = integration
  let response = await requestEvents(activeIntegration.access_token)
  if (response.status === 401) {
    activeIntegration = await refreshGoogleAccessToken({ supabase, userId, integration: activeIntegration, fetchImpl })
    response = await requestEvents(activeIntegration.access_token)
  }
  if (response.status === 401) throw new GoogleCalendarAuthError()
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.error?.message || 'Google Calendar could not be read')
    error.status = response.status
    throw error
  }
  const body = await response.json()
  return { items: body.items || [], integration: activeIntegration }
}

export async function recordGoogleCalendarSync({ supabase, userId }) {
  const syncedAt = new Date().toISOString()
  const { error } = await supabase.from('integrations').update({ last_synced_at: syncedAt, updated_at: syncedAt })
    .eq('provider', 'google').eq('user_id', userId)
  if (error) console.warn('[Google Calendar] Could not record sync time:', error.message)
  return syncedAt
}
