import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { fetchGoogleCalendarEvents, recordGoogleCalendarSync } from '../_lib/google-calendar.js';

export default async function handler(req, res) {
  try {
    let supabase;
    let user;
    try {
      ({ supabase, user } = await requireAuthenticatedUser(req));
    } catch (err) {
      console.error('[Google Calendar] Authentication failed:', err.message);
      return res.status(err.status || 500).json({
        error: err.status === 401 ? err.message : 'Database connection failed',
        details: err.message
      });
    }

    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[Google Calendar] Database error:', dbError);
      return res.status(500).json({
        error: 'Database error',
        details: dbError.message
      });
    }

    if (!integration) {
      return res.status(401).json({
        error: 'Google Calendar is not connected',
        code: 'GOOGLE_CONNECTION_NOT_FOUND'
      });
    }

    const requestedStart = req.query.timeMin ? new Date(req.query.timeMin) : null;
    const requestedEnd = req.query.timeMax ? new Date(req.query.timeMax) : null;

    if (!requestedStart || !requestedEnd || 
        Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime()) || 
        requestedEnd <= requestedStart) {
      return res.status(400).json({ error: 'Invalid calendar date range' });
    }

    // Use a slightly larger margin for the 62-day check to avoid millisecond/DST issues
    const maximumRangeMs = 63 * 24 * 60 * 60 * 1000;
    if (requestedEnd - requestedStart > maximumRangeMs) {
      return res.status(400).json({ error: 'Calendar range cannot exceed 62 days' });
    }

    const { items: rawEvents } = await fetchGoogleCalendarEvents({
      supabase,
      userId: user.id,
      integration,
      start: requestedStart,
      end: requestedEnd
    });

    const events = rawEvents.map(event => ({
      id: event.id,
      summary: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
      link: event.htmlLink,
      location: event.location || '',
      description: event.description || '',
      meetingLink: event.hangoutLink || ''
    }));

    await recordGoogleCalendarSync({ supabase, userId: user.id });

    return res.status(200).json({ events });
  } catch (error) {
    if (error.code === 'GOOGLE_REAUTH_REQUIRED') {
      return res.status(403).json({
        error: error.message,
        code: error.code
      });
    }

    console.error('[Google Calendar] Error fetching events:', error);
    return res.status(error.status || 500).json({
      error: 'Failed to fetch calendar events',
      details: error.message,
      code: error.code
    });
  }
}
