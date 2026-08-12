import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getOwnedZoomIntegration, requestError, resolveZoomHostMeeting } from '../_lib/zoom-meeting-launch.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, appointmentId } = req.body || {};
    if (!clientId || !appointmentId) throw requestError('Choose a scheduled appointment before joining Zoom.', 400);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) throw requestError('That client is not available.', 404);

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id,zoom_meeting_id,status')
      .eq('id', appointmentId)
      .eq('client_id', client.id)
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'rescheduled'])
      .maybeSingle();
    if (appointmentError) throw appointmentError;
    if (!appointment) throw requestError('That appointment is not available.', 404);
    if (!appointment.zoom_meeting_id) throw requestError('Zoom has not attached a meeting to this appointment yet.', 409);

    const integration = await getOwnedZoomIntegration(supabase, user.id);
    const meeting = await resolveZoomHostMeeting(supabase, integration, appointment.zoom_meeting_id);
    return res.status(200).json({ meetingId: meeting.meetingId, startUrl: meeting.startUrl });
  } catch (error) {
    console.error('[Zoom Join Appointment] Failed', { status: error.status || 500, message: error.message });
    return res.status(error.status || 500).json({ error: error.message || 'Unable to join the Zoom appointment.' });
  }
}
