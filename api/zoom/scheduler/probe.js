import { requireAuthenticatedUser } from '../../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../../_lib/zoom-oauth.js';
import {
  getZoomSchedulerAvailableTimes,
  listZoomSchedulerSchedules,
  summarizeZoomSchedulerProbe
} from '../../_lib/zoom-scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .maybeSingle();

    if (error) throw error;
    if (!integration?.encrypted_refresh_token) {
      return res.status(409).json({ error: 'Connect Zoom before checking Scheduler' });
    }

    const accessToken = await getUsableZoomAccessToken(supabase, integration);
    const schedules = await listZoomSchedulerSchedules(accessToken);
    const activeSchedule = schedules.find((schedule) => schedule?.active !== false) || schedules[0];

    if (!activeSchedule?.schedule_id) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        schedulerAvailable: true,
        scheduleCount: schedules.length,
        activeScheduleCount: 0,
        availableSlotCount: 0,
        firstAvailableSlots: []
      });
    }

    const availability = await getZoomSchedulerAvailableTimes(accessToken, activeSchedule.schedule_id);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ schedulerAvailable: true, ...summarizeZoomSchedulerProbe(schedules, availability) });
  } catch (error) {
    console.error('[Zoom Scheduler Probe]', { status: error.status || 500, code: error.code || null, message: error.message });
    const status = error.status === 401 || error.status === 403 ? error.status : 502;
    return res.status(status).json({
      error: status === 403
        ? 'Zoom Scheduler permission was not granted to this connection'
        : status === 401
          ? 'Zoom connection needs to be reconnected'
          : 'Unable to verify Zoom Scheduler'
    });
  }
}
