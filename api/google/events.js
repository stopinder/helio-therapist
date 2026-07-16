import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  console.log('[Google Calendar] Fetching events...');
  
  try {
    if (!supabase) {
      console.error('[Google Calendar] Supabase client not initialized');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Supabase configuration is missing on the server.'
      });
    }

    // 1. Get credentials from Supabase
    // FUTURE MIGRATION: Query by user_id when Supabase Auth is introduced.
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
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

    let { credentials } = integration;
    if (!credentials || !credentials.access_token) {
      console.warn('[Google Calendar] Credentials missing');
      return res.status(401).json({ 
        error: 'Google Calendar not connected',
        details: 'Stored credentials are empty or invalid'
      });
    }

    let accessToken = credentials.access_token;

    const fetchEvents = async (token) => {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const params = new URLSearchParams({
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    };

    let response = await fetchEvents(accessToken);

    // 3. If 401, try to refresh
    if (response.status === 401 && credentials.refresh_token) {
      console.log('[Google Calendar] Access token expired, refreshing...');
      
      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
      const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

      if (!clientId || !clientSecret || clientId === 'your_google_client_id_here') {
        console.error('[Google Calendar] Google configuration missing during refresh');
        return res.status(500).json({ 
          error: 'Google configuration missing', 
          details: 'Server environment variables not configured correctly'
        });
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: credentials.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        // Update credentials in DB
        credentials = { ...credentials, ...newTokens };
        const { error: updateError } = await supabase
          .from('integrations')
          .update({ credentials })
          .eq('provider', 'google');
        
        if (updateError) {
          console.error('[Google Calendar] Failed to update tokens in DB:', updateError);
          // We can still continue if we have the new token
        }
        
        accessToken = newTokens.access_token;
        // Retry fetch
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
