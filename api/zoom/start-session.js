import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getZoomAccessTokenContext } from '../_lib/zoom-oauth.js';
import { getOwnedZoomIntegration, requestError, resolveZoomHostMeeting } from '../_lib/zoom-meeting-launch.js';

const APPOINTMENT_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

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

export function closestAppointmentMeeting(appointments, sessionOccurredAt) {
  const sessionMs = new Date(sessionOccurredAt).getTime();
  if (!Number.isFinite(sessionMs)) return null;

  return (appointments || [])
    .filter((appointment) => appointment?.zoom_meeting_id && appointment?.starts_at)
    .map((appointment) => ({
      ...appointment,
      distanceMs: Math.abs(new Date(appointment.starts_at).getTime() - sessionMs)
    }))
    .filter((appointment) => Number.isFinite(appointment.distanceMs) && appointment.distanceMs <= APPOINTMENT_MATCH_WINDOW_MS)
    .sort((a, b) => a.distanceMs - b.distanceMs)[0] || null;
}

async function linkMeetingToSession(supabase, userId, clientId, sessionId, meeting) {
  const { error } = await supabase
    .from('zoom_session_links')
    .upsert({
      therapist_user_id: userId,
      client_id: clientId,
      session_ref: String(sessionId),
      zoom_meeting_id: String(meeting.meetingId),
      zoom_meeting_uuid: meeting.meetingUuid ? String(meeting.meetingUuid) : null,
      status: 'started',
      updated_at: new Date().toISOString()
    }, { onConflict: 'therapist_user_id,session_ref' });

  if (error) {
    console.error('[Zoom Start Session] Unable to link meeting to session', { code: error.code, message: error.message });
    throw requestError('Helio could not link the Zoom meeting to this session. Please try again.', 503);
  }
}

async function existingSessionMeeting(supabase, userId, sessionId) {
  const { data, error } = await supabase
    .from('zoom_session_links')
    .select('zoom_meeting_id')
    .eq('therapist_user_id', userId)
    .eq('session_ref', String(sessionId))
    .maybeSingle();
  if (error) throw error;
  return data?.zoom_meeting_id ? String(data.zoom_meeting_id) : null;
}

async function matchingAppointmentMeeting(supabase, userId, clientId, sessionOccurredAt) {
  const sessionDate = new Date(sessionOccurredAt);
  if (!Number.isFinite(sessionDate.getTime())) return null;

  const from = new Date(sessionDate.getTime() - APPOINTMENT_MATCH_WINDOW_MS).toISOString();
  const to = new Date(sessionDate.getTime() + APPOINTMENT_MATCH_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .select('id,starts_at,zoom_meeting_id')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .in('status', ['scheduled', 'rescheduled'])
    .not('zoom_meeting_id', 'is', null)
    .gte('starts_at', from)
    .lte('starts_at', to)
    .order('starts_at', { ascending: true });

  if (error) throw error;
  return closestAppointmentMeeting(data, sessionOccurredAt);
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

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id,occurred_at')
      .eq('id', sessionRef)
      .eq('client_id', client.id)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw requestError('That session is not available to start.', 404);

    const integration = await getOwnedZoomIntegration(supabase, user.id);

    const linkedMeetingId = await existingSessionMeeting(supabase, user.id, session.id);
    if (linkedMeetingId) {
      const launch = await resolveZoomHostMeeting(supabase, integration, linkedMeetingId);
      console.info('[Zoom Start Session] Reusing linked session meeting', { meetingId: linkedMeetingId });
      return res.status(200).json({ meetingId: launch.meetingId, startUrl: launch.startUrl, source: 'session_link' });
    }

    const appointment = await matchingAppointmentMeeting(supabase, user.id, client.id, session.occurred_at);
    if (appointment?.zoom_meeting_id) {
      const launch = await resolveZoomHostMeeting(supabase, integration, appointment.zoom_meeting_id);
      await linkMeetingToSession(supabase, user.id, client.id, session.id, { meetingId: launch.meetingId });
      console.info('[Zoom Start Session] Reusing scheduled appointment meeting', { appointmentId: appointment.id, meetingId: launch.meetingId });
      return res.status(200).json({ meetingId: launch.meetingId, startUrl: launch.startUrl, source: 'appointment' });
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

    await linkMeetingToSession(supabase, user.id, client.id, session.id, {
      meetingId: String(meeting.id),
      meetingUuid: meeting.uuid ? String(meeting.uuid) : null
    });

    console.info('[Zoom Start Session] Meeting linked', {
      meetingId: String(meeting.id),
      retried,
      refreshState: token.refreshed ? 'refreshed' : 'valid'
    });

    return res.status(201).json({ meetingId: String(meeting.id), startUrl: meeting.start_url, source: 'created' });
  } catch (error) {
    console.error('[Zoom Start Session] Failed', { status: error.status || 500, message: error.message });
    return res.status(error.status || 500).json({ error: error.message || 'Unable to start a Zoom session.' });
  }
}
