import { getZoomAccessTokenContext } from './zoom-oauth.js';

export function requestError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function getOwnedZoomIntegration(supabase, userId) {
  const fields = 'user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope';
  const { data, error } = await supabase
    .from('integrations')
    .select(fields)
    .eq('user_id', userId)
    .eq('provider', 'zoom')
    .maybeSingle();

  if (error) throw error;
  if (!data?.encrypted_refresh_token) {
    throw requestError('Connect Zoom in Settings before joining a Zoom session.', 409);
  }
  return data;
}

async function fetchMeeting(accessToken, meetingId) {
  return fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function resolveZoomHostMeeting(supabase, integration, meetingId) {
  let token = await getZoomAccessTokenContext(supabase, integration);
  let response = await fetchMeeting(token.accessToken, meetingId);
  let retried = false;

  if (response.status === 401) {
    token = await getZoomAccessTokenContext(supabase, integration, { forceRefresh: true });
    response = await fetchMeeting(token.accessToken, meetingId);
    retried = true;
  }

  if (!response.ok) {
    const status = response.status === 404 ? 404 : (response.status === 403 ? 409 : 502);
    const message = response.status === 404
      ? 'This Zoom meeting is no longer available.'
      : response.status === 403
        ? 'Zoom needs permission to read this meeting. Reconnect Zoom in Settings.'
        : `Zoom could not load the meeting (${response.status}).`;
    console.warn('[Zoom Meeting Launch] Meeting lookup unavailable', { meetingId: String(meetingId), status: response.status, retried });
    throw requestError(message, status);
  }

  const meeting = await response.json();
  if (!meeting?.start_url) throw requestError('Zoom did not return a host meeting link.', 502);

  return {
    meetingId: String(meeting.id || meetingId),
    startUrl: meeting.start_url,
    refreshed: token.refreshed,
    retried
  };
}
