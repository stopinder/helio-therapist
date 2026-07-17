import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  console.log('[Google Calendar] Fetching events...');

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

    // FUTURE MIGRATION: Query by user_id when Supabase Auth is introduced.
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

    if (!integration.access_token) {
      console.warn('[Google Calendar] Access token missing');
      return res.status(401).json({
        error: 'Google Calendar not connected',
        details: 'Stored access token is empty or invalid'
      });
    }

    let accessToken = integration.access_token;

    const fetchEvents = async (token) => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    };

    let response = await fetchEvents(accessToken);

    if (response.status === 401 && integration.refresh_token) {
      console.log('[Google Calendar] Access token expired, refreshing...');

      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
      const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

      if (!clientId) {
        console.error('[Google Calendar] Missing GOOGLE_CLIENT_ID during refresh');
        return res.status(500).json({
          error: 'Google configuration missing',
          details: 'GOOGLE_CLIENT_ID is not configured.'
        });
      }

      if (!clientSecret) {
        console.error('[Google Calendar] Missing GOOGLE_CLIENT_SECRET during refresh');
        return res.status(500).json({
          error: 'Google configuration missing',
          details: 'GOOGLE_CLIENT_SECRET is not configured.'
        });
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        const tokenUpdate = {
          access_token: newTokens.access_token,
          token_type: newTokens.token_type || integration.token_type,
          scope: newTokens.scope || integration.scope,
          expires_at: newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
            : integration.expires_at,
          updated_at: new Date().toISOString()
        };

        if (newTokens.refresh_token) {
          tokenUpdate.refresh_token = newTokens.refresh_token;
        }

        const { error: updateError } = await supabase
          .from('integrations')
          .update(tokenUpdate)
          .eq('provider', 'google')
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[Google Calendar] Failed to update tokens in DB:', updateError);
        }

        accessToken = newTokens.access_token;
        response = await fetchEvents(accessToken);
      } else {
        const refreshError = await refreshResponse.json().catch(() => ({}));
        console.error('[Google Calendar] Token refresh failed:', refreshError);
        return res.status(403).json({
          error: 'Session expired, please reconnect',
          details: refreshError.error_description || refreshError.error || 'Refresh token invalid'
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Google Calendar] API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to fetch calendar events',
        details: errorData.error?.message || response.statusText
      });
    }

    const data = await response.json();
    if (!data.items) {
      console.warn('[Google Calendar] Unexpected API response format:', data);
      return res.status(500).json({
        error: 'Invalid response from Google',
        details: 'Expected items array was missing'
      });
    }

    const events = data.items.map(event => ({
      id: event.id,
      summary: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      link: event.htmlLink
    }));

    console.log(`[Google Calendar] Successfully fetched ${events.length} events`);
    return res.status(200).json({ events });
  } catch (error) {
    console.error('[Google Calendar] Fatal internal error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
