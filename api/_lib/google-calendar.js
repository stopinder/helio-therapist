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
  if (!integration?.refresh_token) throw new GoogleCalendarAuthError()
  const { clientId, clientSecret } = googleConfiguration()
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: integration.refresh_token, grant_type: 'refresh_token' })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) throw new GoogleCalendarAuthError(payload.error_description || 'Google Calendar needs permission again')
  const updated = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || integration.refresh_token,
    token_type: payload.token_type || integration.token_type || null,
    scope: payload.scope || integration.scope || null,
    expires_at: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : integration.expires_at || null,
    updated_at: new Date().toISOString()
  }
  const { error } = await supabase.from('integrations').update(updated).eq('provider', 'google').eq('user_id', userId)
  if (error) throw new Error(`Unable to save refreshed Google Calendar access: ${error.message}`)
  return { ...integration, ...updated }
}

async function googleRequest({ supabase, userId, integration, url, options = {}, fetchImpl = fetch }) {
  if (!integration?.access_token) throw new GoogleCalendarAuthError()
  let activeIntegration = integration
  const send = () => fetchImpl(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${activeIntegration.access_token}` }
  })
  let response = await send()
  if (response.status === 401) {
    activeIntegration = await refreshGoogleAccessToken({ supabase, userId, integration: activeIntegration, fetchImpl })
    response = await send()
  }
  return { response, integration: activeIntegration }
}

export function googleCalendarEventPayload({ appointmentId, startsAt, endsAt, timezone }) {
  return {
    summary: 'Helio appointment',
    description: 'Scheduled through Helio.',
    start: { dateTime: startsAt, ...(timezone ? { timeZone: timezone } : {}) },
    end: { dateTime: endsAt, ...(timezone ? { timeZone: timezone } : {}) },
    extendedProperties: { private: { heliosAppointmentId: String(appointmentId) } }
  }
}

export async function syncAppointmentToGoogleCalendar({ supabase, userId, appointment, fetchImpl = fetch }) {
  const { data: integration, error } = await supabase.from('integrations')
    .select('access_token,refresh_token,token_type,scope,expires_at')
    .eq('provider', 'google').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!integration) return { synced: false, reason: 'not-connected' }

  const query = new URLSearchParams({
    privateExtendedProperty: `heliosAppointmentId=${appointment.id}`,
    maxResults: '1',
    showDeleted: 'false'
  })
  const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`
  const { response: listResponse, integration: activeIntegration } = await googleRequest({ supabase, userId, integration, url: listUrl, fetchImpl })
  if (!listResponse.ok) throw new Error(`Could not find Helio appointment in Google Calendar (${listResponse.status})`)
  const existing = (await listResponse.json()).items?.[0] || null

  if (appointment.status === 'cancelled') {
    if (!existing?.id) return { synced: true, action: 'already-absent' }
    const { response } = await googleRequest({
      supabase, userId, integration: activeIntegration,
      url: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existing.id)}`,
      options: { method: 'DELETE' }, fetchImpl
    })
    if (!response.ok && response.status !== 410) throw new Error(`Could not remove Google Calendar appointment (${response.status})`)
    return { synced: true, action: 'deleted' }
  }

  if (!appointment.starts_at || !appointment.ends_at) return { synced: false, reason: 'missing-time' }
  const payload = googleCalendarEventPayload({ appointmentId: appointment.id, startsAt: appointment.starts_at, endsAt: appointment.ends_at, timezone: appointment.timezone })
  const url = existing?.id
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existing.id)}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  const { response } = await googleRequest({
    supabase, userId, integration: activeIntegration, url,
    options: { method: existing?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, fetchImpl
  })
  if (!response.ok) throw new Error(`Could not sync Helio appointment to Google Calendar (${response.status})`)
  return { synced: true, action: existing?.id ? 'updated' : 'created' }
}

export async function fetchGoogleCalendarEvents({ supabase, userId, integration, start, end, fetchImpl = fetch }) {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    const error = new Error('Invalid calendar date range'); error.status = 400; throw error
  }
  const { response: listResponse, integration: activeIntegration } = await googleRequest({ supabase, userId, integration, url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList', fetchImpl })
  if (!listResponse.ok) throw new Error((await listResponse.json().catch(() => ({}))).error?.message || 'Could not list Google Calendars')
  const calendars = (await listResponse.json()).items || [{ id: 'primary' }]
  const allEvents = []
  for (const calendar of calendars) {
    let pageToken = null
    do {
      const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
      if (pageToken) params.append('pageToken', pageToken)
      const { response } = await googleRequest({ supabase, userId, integration: activeIntegration, url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`, fetchImpl })
      if (!response.ok) break
      const data = await response.json(); if (data.items) allEvents.push(...data.items); pageToken = data.nextPageToken
    } while (pageToken)
  }
  return { items: allEvents, integration: activeIntegration }
}

export async function recordGoogleCalendarSync({ supabase, userId }) {
  const syncedAt = new Date().toISOString()
  const { error } = await supabase.from('integrations').update({ last_synced_at: syncedAt, updated_at: syncedAt }).eq('provider', 'google').eq('user_id', userId)
  if (error) console.warn('[Google Calendar] Could not record sync time:', error.message)
  return syncedAt
}
