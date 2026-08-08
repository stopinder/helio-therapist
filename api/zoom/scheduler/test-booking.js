import { requireAuthenticatedUser } from '../../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../../_lib/zoom-oauth.js';
import {
  createZoomSchedulerBooking,
  deleteZoomSchedulerEvent,
  getZoomSchedulerAvailableTimes,
  getZoomSchedulerEvent,
  listAvailableZoomSchedulerSlots,
  listZoomSchedulerSchedules
} from '../../_lib/zoom-scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let createdEventId = null;
  let accessToken = null;
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .maybeSingle();
    if (error) throw error;
    if (!integration?.encrypted_refresh_token) return res.status(409).json({ error: 'Connect Zoom first' });

    accessToken = await getUsableZoomAccessToken(supabase, integration);
    const schedules = await listZoomSchedulerSchedules(accessToken);
    const schedule = schedules.find((item) => item?.active !== false) || schedules[0];
    if (!schedule?.schedule_id) return res.status(409).json({ error: 'No Zoom Scheduler schedule is available' });

    const schedulerUser = schedule?.organizer?.email || schedule?.organizer_email || schedule?.owner_email || schedule?.email;
    if (!schedulerUser) return res.status(409).json({ error: 'Zoom Scheduler did not return an organizer email for this schedule' });

    const availability = await getZoomSchedulerAvailableTimes(accessToken, schedule.schedule_id);
    const slot = listAvailableZoomSchedulerSlots(availability)[0];
    if (!slot?.startTime) return res.status(409).json({ error: 'No available Zoom Scheduler slot was found' });

    const duration = Number(availability?.duration || schedule?.duration || 50);
    const timeZone = schedule?.time_zone || schedule?.timezone || 'Europe/London';

    const booking = await createZoomSchedulerBooking(accessToken, schedulerUser, {
      schedule_id: schedule.schedule_id,
      duration,
      start_date_time: slot.startTime,
      time_zone: timeZone,
      booker: {
        first_name: 'Helio',
        last_name: 'Scheduler Test',
        email: user.email,
        time_format: '24h'
      },
      location_configuration: {
        kind: 'zoomMeeting'
      }
    });

    createdEventId = booking?.event_id || booking?.scheduled_event_id || booking?.id || null;
    const event = createdEventId ? await getZoomSchedulerEvent(accessToken, createdEventId) : booking;
    const zoomMeetingPresent = Boolean(
      event?.zoom_meeting_id || event?.meeting_id || event?.join_url || event?.zoom_join_url ||
      booking?.zoom_meeting_id || booking?.meeting_id || booking?.join_url || booking?.zoom_join_url ||
      event?.location_kind === 'zoomMeeting' || booking?.location_kind === 'zoomMeeting'
    );

    if (createdEventId) {
      await deleteZoomSchedulerEvent(accessToken, createdEventId);
      createdEventId = null;
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      created: true,
      cancelled: true,
      zoomMeetingPresent,
      startTime: slot.startTime,
      duration
    });
  } catch (error) {
    if (createdEventId && accessToken) {
      try { await deleteZoomSchedulerEvent(accessToken, createdEventId); } catch (cleanupError) {
        console.error('[Zoom Scheduler Test Cleanup]', { message: cleanupError.message });
      }
    }
    console.error('[Zoom Scheduler Test Booking]', { status: error.status || 500, code: error.code || null, message: error.message });
    return res.status(error.status && error.status < 500 ? error.status : 502).json({
      error: error.message || 'Zoom Scheduler booking test failed'
    });
  }
}
