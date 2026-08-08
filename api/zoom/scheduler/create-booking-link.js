import crypto from 'node:crypto';
import { requireAuthenticatedUser } from '../../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../../_lib/zoom-oauth.js';
import { createZoomSchedulerSingleUseLink, listZoomSchedulerSchedules } from '../../_lib/zoom-scheduler.js';

function withCorrelationToken(rawLink, token) {
  const url = new URL(rawLink);
  url.searchParams.set('utm_content', token);
  return url.toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const clientId = String(req.body?.clientId || '').trim();
    if (!clientId) return res.status(400).json({ error: 'Choose a client first' });

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .eq('archived', false)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .maybeSingle();
    if (integrationError) throw integrationError;
    if (!integration?.encrypted_refresh_token) return res.status(409).json({ error: 'Connect Zoom in Settings first' });

    const accessToken = await getUsableZoomAccessToken(supabase, integration);
    const schedules = await listZoomSchedulerSchedules(accessToken);
    const schedule = schedules.find((item) => item?.active !== false) || schedules[0];
    if (!schedule?.schedule_id) return res.status(409).json({ error: 'No active Zoom Scheduler schedule is available' });

    const correlationToken = crypto.randomBytes(24).toString('base64url');
    const result = await createZoomSchedulerSingleUseLink(accessToken, schedule.schedule_id);
    const rawLink = result?.scheduling_url || result?.single_use_link || result?.booking_link || result?.link || result?.url;
    if (!rawLink) return res.status(502).json({ error: 'Zoom did not return a booking link' });

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        client_id: client.id,
        status: 'booking_link_created',
        correlation_token: correlationToken,
        zoom_schedule_id: schedule.schedule_id
      })
      .select('id')
      .single();
    if (appointmentError) throw appointmentError;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ appointmentId: appointment.id, bookingUrl: withCorrelationToken(rawLink, correlationToken) });
  } catch (error) {
    console.error('[Zoom Scheduler Booking Link]', { status: error.status || 500, message: error.message });
    return res.status(error.status && error.status < 500 ? error.status : 502).json({ error: error.message || 'Unable to create booking link' });
  }
}
