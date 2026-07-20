import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getZoomAccessTokenContext } from '../_lib/zoom-oauth.js';

function requestError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function createZoomMeeting(accessToken) {
  return fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    // Do not include client-identifying information in Zoom's meeting title.
    body: JSON.stringify({ topic: 'Helio session', type: 1 })
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, sessionRef } = req.body || {};

    if (!clientId || !sessionRef) {
      throw requestError('Choose a client before starting a Zoom session.', 400);
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError) throw clientError;
    if (!client) throw requestError('That client is not available for this session.', 404);

    const integrationFields = 'user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope';
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select(integrationFields)
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .maybeSingle();

    if (integrationError) throw integrationError;
    if (!integration?.encrypted_refresh_token) {
      throw requestError('Connect Zoom in Settings before starting a Zoom session.', 409);
    }

    let token = await getZoomAccessTokenContext(supabase, integration);
    let meetingResponse = await createZoomMeeting(token.accessToken);
    let retried = false;

    if (meetingResponse.status === 401) {
      token = await getZoomAccessTokenContext(supabase, integration, { forceRefresh: true });
      meetingResponse = await createZoomMeeting(token.accessToken);
      retried = true;
    }

    if (!meetingResponse.ok) {
      const message = meetingResponse.status === 403
        ? 'Zoom needs permission to create meetings. Add the Zoom meeting creation scope, then reconnect Zoom in Settings.'
        : `Zoom could not create a meeting (${meetingResponse.status}).`;
      console.warn('[Zoom Start Session] Meeting creation unavailable', {
        status: meetingResponse.status,
        retried,
        refreshState: token.refreshed ? 'refreshed' : 'valid'
      });
      throw requestError(message, meetingResponse.status === 403 ? 409 : 502);
    }

    const meeting = await meetingResponse.json();
    if (!meeting?.id || !meeting?.start_url) {
      throw requestError('Zoom did not return a host meeting link.', 502);
    }

    const { error: linkError } = await supabase
      .from('zoom_session_links')
      .upsert({
        therapist_user_id: user.id,
        client_id: client.id,
        session_ref: String(sessionRef),
        zoom_meeting_id: String(meeting.id),
        zoom_meeting_uuid: meeting.uuid ? String(meeting.uuid) : null,
        status: 'started',
        updated_at: new Date().toISOString()
      }, { onConflict: 'therapist_user_id,session_ref' });

    if (linkError) {
      console.error('[Zoom Start Session] Unable to link meeting to session', { code: linkError.code, message: linkError.message });
      throw requestError('Helio could not link the Zoom meeting to this session. Please try again.', 503);
    }

    console.info('[Zoom Start Session] Meeting linked', {
      meetingId: String(meeting.id),
      retried,
      refreshState: token.refreshed ? 'refreshed' : 'valid'
    });

    return res.status(201).json({ meetingId: String(meeting.id), startUrl: meeting.start_url });
  } catch (error) {
    console.error('[Zoom Start Session] Failed', { status: error.status || 500, message: error.message });
    return res.status(error.status || 500).json({ error: error.message || 'Unable to start a Zoom session.' });
  }
}
