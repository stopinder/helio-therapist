import { requireAuthenticatedUser } from '../../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../../_lib/zoom-oauth.js';
import { listZoomSchedulerSchedules } from '../../_lib/zoom-scheduler.js';

function isZoomSchedulerUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us'));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .maybeSingle();
    if (integrationError) throw integrationError;
    if (!integration?.encrypted_refresh_token) {
      return res.status(409).json({ error: 'Connect Zoom in Settings first' });
    }

    const accessToken = await getUsableZoomAccessToken(supabase, integration);
    const schedules = await listZoomSchedulerSchedules(accessToken);
    const schedule = schedules.find(item => item?.active !== false && item?.scheduling_url)
      || schedules.find(item => item?.scheduling_url);
    if (!schedule) {
      return res.status(409).json({ error: 'No Zoom Scheduler booking page is available' });
    }
    if (!isZoomSchedulerUrl(schedule.scheduling_url)) {
      console.error('[Zoom Scheduler public link] Zoom returned an unexpected scheduling URL host');
      return res.status(502).json({ error: 'Zoom returned an invalid public booking link' });
    }

    return res.status(200).json({ bookingUrl: schedule.scheduling_url });
  } catch (error) {
    console.error('[Zoom Scheduler public link]', { status: error.status || 500, message: error.message });
    return res.status(error.status && error.status < 500 ? error.status : 502)
      .json({ error: error.message || 'Unable to get your public booking link' });
  }
}
