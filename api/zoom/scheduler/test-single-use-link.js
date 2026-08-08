import { requireAuthenticatedUser } from '../../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../../_lib/zoom-oauth.js';
import {
  createZoomSchedulerSingleUseLink,
  listZoomSchedulerSchedules
} from '../../_lib/zoom-scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const accessToken = await getUsableZoomAccessToken(supabase, integration);
    const schedules = await listZoomSchedulerSchedules(accessToken);
    const schedule = schedules.find((item) => item?.active !== false) || schedules[0];
    if (!schedule?.schedule_id) return res.status(409).json({ error: 'No Zoom Scheduler schedule is available' });

    const result = await createZoomSchedulerSingleUseLink(accessToken, schedule.schedule_id);
    const link = result?.scheduling_url || result?.single_use_link || result?.booking_link || result?.link || result?.url || null;

    if (!link) {
      console.error('[Zoom Scheduler Single Use Link]', { message: 'Zoom returned no recognizable link', keys: Object.keys(result || {}) });
      return res.status(502).json({ error: 'Zoom created a response but did not return a recognizable booking link' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ created: true, link });
  } catch (error) {
    console.error('[Zoom Scheduler Single Use Link]', { status: error.status || 500, code: error.code || null, message: error.message });
    return res.status(error.status && error.status < 500 ? error.status : 502).json({
      error: error.message || 'Unable to create Zoom Scheduler single-use link'
    });
  }
}
