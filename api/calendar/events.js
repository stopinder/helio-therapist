import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { fetchGoogleCalendarEvents, GoogleCalendarAuthError, recordGoogleCalendarSync } from '../_lib/google-calendar.js';

const MAXIMUM_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

function mapGoogleEvent(event) {
  return {
    id: `google:${event.id}`,
    provider: 'Google Calendar',
    summary: event.summary || '(No title)',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    link: event.htmlLink || '',
    location: event.location || '',
    description: event.description || '',
    meetingLink: event.hangoutLink || ''
  };
}

function mapCalendlyEvent(event) {
  const location = event.location || {};
  return {
    id: `calendly:${event.uri || event.uuid}`,
    provider: 'Calendly',
    summary: event.name || 'Calendly booking',
    start: event.start_time,
    end: event.end_time,
    allDay: false,
    link: location.join_url || '',
    location: location.location || (location.type === 'zoom' ? 'Zoom meeting' : ''),
    description: 'Booked through Calendly',
    meetingLink: location.join_url || ''
  };
}

async function fetchCalendlyEvents(integration, start, end) {
  const headers = { Authorization: `Bearer ${integration.access_token}` };
  const meResponse = await fetch('https://api.calendly.com/users/me', { headers });
  if (!meResponse.ok) throw new Error('Calendly connection needs to be renewed');
  const me = await meResponse.json();
  const userUri = me.resource?.uri;
  if (!userUri) throw new Error('Calendly did not return an account');

  const params = new URLSearchParams({
    user: userUri, min_start_time: start.toISOString(), max_start_time: end.toISOString(),
    status: 'active', sort: 'start_time:asc', count: '100'
  });
  const response = await fetch(`https://api.calendly.com/scheduled_events?${params}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.title || 'Calendly events could not be read');
  }
  const body = await response.json();
  return (body.collection || []).map(mapCalendlyEvent);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const start = new Date(req.query.timeMin || Date.now());
    const end = new Date(req.query.timeMax || Date.now() + 86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || end - start > MAXIMUM_RANGE_MS) {
      return res.status(400).json({ error: 'Invalid calendar date range' });
    }

    const { data: integrations, error: databaseError } = await supabase
      .from('integrations').select('provider, access_token, refresh_token, token_type, scope, expires_at, last_synced_at').eq('user_id', user.id)
      .in('provider', ['google', 'calendly']);
    if (databaseError) throw new Error(databaseError.message);
    const googleIntegration = integrations?.find((integration) => integration.provider === 'google');
    if (!integrations?.length) return res.status(401).json({
      error: 'Google Calendar is not connected', code: 'GOOGLE_CONNECTION_REQUIRED',
      details: 'Connect Google Calendar to show your schedule.'
    });

    const jobs = integrations.map(async (integration) => {
      if (integration.provider === 'google') {
        const result = await fetchGoogleCalendarEvents({ supabase, userId: user.id, integration, start, end });
        const syncedAt = await recordGoogleCalendarSync({ supabase, userId: user.id });
        return { provider: 'google', events: result.items.map(mapGoogleEvent), syncedAt };
      }
      if (!integration.access_token) return [];
      return fetchCalendlyEvents(integration, start, end);
    });
    const results = await Promise.allSettled(jobs);
    const googleResult = results.find((result, index) => integrations[index].provider === 'google');
    const googleFailure = googleResult?.status === 'rejected' ? googleResult.reason : null;
    const events = results.filter(result => result.status === 'fulfilled').flatMap(result => {
      const value = result.value;
      return value?.provider === 'google' ? value.events : value;
    })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    const failures = results.filter(result => result.status === 'rejected');
    if (!events.length && failures.length === results.length) throw failures[0].reason;

    const googleStatus = !googleIntegration
      ? { state: 'not_connected' }
      : googleFailure instanceof GoogleCalendarAuthError
        ? { state: 'reauth_required', message: googleFailure.message }
        : googleFailure
          ? { state: 'unavailable', message: googleFailure.message }
          : { state: 'synced', lastSyncedAt: googleResult?.value?.syncedAt || googleIntegration.last_synced_at };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ events, google: googleStatus, warnings: failures.map(result => result.reason.message) });
  } catch (error) {
    console.error('[Calendar Events] Error:', error.message);
    return res.status(error.status || 500).json({
      error: error instanceof GoogleCalendarAuthError ? 'Google Calendar needs permission again' : 'Failed to fetch calendar events',
      code: error.code,
      details: error.message
    });
  }
}
