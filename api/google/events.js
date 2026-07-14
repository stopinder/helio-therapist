import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  console.log('[Google Calendar] Fetching events...');
  
  try {
    // 1. Get credentials from Supabase
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
      .single();

    if (dbError || !integration) {
      console.error('[Google Calendar] Integration not found:', dbError);
      return res.status(401).json({ error: 'Google Calendar not connected' });
    }

    let { credentials } = integration;

    // 2. Check if token needs refresh (simplified check)
    // In a production app, we'd check credentials.expiry_date
    // For now, we'll try to use it and refresh if we get a 401.
    // Or we can proactively refresh if we want to be safe.
    
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
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
          client_secret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
          refresh_token: credentials.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        // Update credentials in DB
        credentials = { ...credentials, ...newTokens };
        await supabase
          .from('integrations')
          .update({ credentials })
          .eq('provider', 'google');
        
        accessToken = newTokens.access_token;
        // Retry fetch
        response = await fetchEvents(accessToken);
      } else {
        const refreshError = await refreshResponse.json();
        console.error('[Google Calendar] Token refresh failed:', refreshError);
        return res.status(403).json({ error: 'Session expired, please reconnect' });
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Google Calendar] API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to fetch calendar events' });
    }

    const data = await response.json();
    const events = data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      link: event.htmlLink
    }));

    console.log(`[Google Calendar] Successfully fetched ${events.length} events`);
    return res.status(200).json({ events });

  } catch (error) {
    console.error('[Google Calendar] Internal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
