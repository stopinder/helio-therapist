import crypto from 'crypto';
import { getSupabaseClient } from '../_lib/supabase.js';
import { getZoomAccessTokenContext } from '../_lib/zoom-oauth.js';
import { downloadZoomTranscriptWithRetry } from '../_lib/zoom-download.js';
import { safeZoomWebhookPayload, schedulerAppointmentEvent, verifyZoomWebhookRequest } from '../_lib/zoom-webhook.js';

export const config = { api: { bodyParser: false } };

async function readWebhookBody(req) {
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body, 'utf8');
    return { body: JSON.parse(rawBody.toString('utf8')), rawBody };
  }
  if (req.body && typeof req.body === 'object') {
    const rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
    return { body: req.body, rawBody };
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      const error = new Error('Webhook payload is too large');
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  const rawBody = Buffer.concat(chunks);
  return { body: JSON.parse(rawBody.toString('utf8')), rawBody };
}

function transcriptFile(recording) {
  return (recording.recording_files || []).find((file) => {
    const fileType = String(file.file_type || '').toUpperCase();
    const recordingType = String(file.recording_type || '').toLowerCase();
    return fileType === 'TRANSCRIPT' || recordingType.includes('transcript');
  });
}

async function updateEvent(supabase, id, update) {
  if (!id) return;
  const { error } = await supabase.from('zoom_webhook_events').update(update).eq('id', id);
  if (error) console.error('[Zoom Webhook] Unable to update intake event', error.message);
}

async function applySchedulerEvent(supabase, intakeEventId, schedulerEvent) {
  if (!schedulerEvent.correlationToken) {
    await updateEvent(supabase, intakeEventId, {
      processing_status: 'unmatched',
      processing_error: 'Scheduler event did not contain the Helio correlation token'
    });
    return;
  }

  const update = {
    status: schedulerEvent.status,
    zoom_event_id: schedulerEvent.eventId,
    zoom_meeting_id: schedulerEvent.meetingId,
    starts_at: schedulerEvent.startsAt,
    ends_at: schedulerEvent.endsAt,
    timezone: schedulerEvent.timezone,
    updated_at: new Date().toISOString()
  };

  const { data: appointment, error } = await supabase
    .from('appointments')
    .update(update)
    .eq('correlation_token', schedulerEvent.correlationToken)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!appointment) {
    await updateEvent(supabase, intakeEventId, {
      processing_status: 'unmatched',
      processing_error: 'No appointment matched the Scheduler correlation token'
    });
    return;
  }

  await updateEvent(supabase, intakeEventId, { processing_status: 'stored', processing_error: null });
  console.info('[Zoom Webhook] Scheduler appointment updated', {
    event: schedulerEvent.eventType,
    appointmentId: appointment.id,
    status: schedulerEvent.status
  });
}

async function findSessionLink(supabase, therapistUserId, meetingId) {
  const { data, error } = await supabase
    .from('zoom_session_links')
    .select('client_id, session_ref')
    .eq('therapist_user_id', therapistUserId)
    .eq('zoom_meeting_id', meetingId)
    .maybeSingle();
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    console.warn('[Zoom Webhook] Session-link lookup unavailable', { code: error.code });
    return null;
  }
  if (error) throw error;
  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = (process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '').trim();
  if (!secret) {
    console.error('[Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN is not configured');
    return res.status(503).json({ error: 'Webhook configuration missing' });
  }

  let body;
  let rawBody;
  try {
    ({ body, rawBody } = await readWebhookBody(req));
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || 'Invalid webhook payload' });
  }

  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken;
    if (!plainToken) return res.status(400).json({ error: 'Missing Zoom validation token' });
    const encryptedToken = crypto.createHmac('sha256', secret).update(plainToken).digest('hex');
    return res.status(200).json({ plainToken, encryptedToken });
  }

  const verification = verifyZoomWebhookRequest({ headers: req.headers, body, rawBody, secret });
  if (!verification.valid) {
    console.warn('[Zoom Webhook] Rejected unauthenticated event', { reason: verification.reason });
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const recording = body.payload?.object || {};
  const eventType = body.event || 'unknown';
  const schedulerEvent = schedulerAppointmentEvent(body);
  const meetingId = schedulerEvent?.meetingId || (recording.id ? String(recording.id) : null);
  const hostId = recording.host_id ? String(recording.host_id) : null;

  console.info('[Zoom Webhook] Event received', {
    event: eventType,
    meetingId,
    recordingFiles: Array.isArray(recording.recording_files) ? recording.recording_files.length : 0
  });

  try {
    const supabase = getSupabaseClient();
    const { data: intakeEvent, error: intakeError } = await supabase
      .from('zoom_webhook_events')
      .insert({
        delivery_key: verification.deliveryKey,
        event_type: eventType,
        zoom_meeting_id: meetingId,
        zoom_host_id: hostId,
        payload: safeZoomWebhookPayload(body)
      })
      .select('id')
      .single();

    if (intakeError?.code === '23505') {
      console.info('[Zoom Webhook] Duplicate delivery acknowledged', { meetingId, eventType });
      return res.status(200).json({ received: true, duplicate: true });
    }
    if (intakeError) throw intakeError;

    if (schedulerEvent) {
      await applySchedulerEvent(supabase, intakeEvent.id, schedulerEvent);
      return res.status(200).json({ received: true });
    }

    if (eventType !== 'recording.transcript_completed' && eventType !== 'recording.completed') {
      return res.status(200).json({ received: true });
    }

    if (!hostId || !meetingId) {
      await updateEvent(supabase, intakeEvent.id, {
        processing_status: 'failed',
        processing_error: 'Recording event did not contain a Zoom host id or meeting id'
      });
      return res.status(200).json({ received: true });
    }

    let file = transcriptFile(recording);
    const integrationFields = 'user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope';
    const { data: matchedIntegration, error: integrationError } = await supabase
      .from('integrations')
      .select(integrationFields)
      .eq('provider', 'zoom')
      .eq('provider_account_id', hostId)
      .maybeSingle();
    if (integrationError) throw integrationError;

    let integration = matchedIntegration;
    if (!integration) {
      const { data: zoomIntegrations, error: fallbackError } = await supabase
        .from('integrations')
        .select(integrationFields)
        .eq('provider', 'zoom')
        .limit(2);
      if (fallbackError) throw fallbackError;
      if (zoomIntegrations?.length === 1) {
        integration = zoomIntegrations[0];
        console.info('[Zoom Webhook] Using single-therapist MVP account fallback', { meetingId, hostId });
      }
    }

    if (!integration) {
      await updateEvent(supabase, intakeEvent.id, {
        processing_status: 'unmatched',
        processing_error: 'No connected Helio therapist matched this Zoom host'
      });
      console.warn('[Zoom Webhook] Transcript awaiting account match', { meetingId, hostId });
      return res.status(200).json({ received: true });
    }

    const sessionLink = await findSessionLink(supabase, integration.user_id, meetingId);
    const getToken = (options) => getZoomAccessTokenContext(supabase, integration, options);
    const initialToken = await getToken({ forceRefresh: false });

    const recordingsResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`,
      { headers: { Authorization: `Bearer ${initialToken.accessToken}` } }
    );
    if (recordingsResponse.ok) {
      const recordingsMetadata = await recordingsResponse.json();
      const canonicalFile = transcriptFile(recordingsMetadata);
      if (canonicalFile?.download_url && canonicalFile?.id) {
        file = canonicalFile;
        console.info('[Zoom Webhook] Transcript file resolved from recording list', { meetingId });
      }
    } else {
      console.warn('[Zoom Webhook] Recording file lookup unavailable', { meetingId, status: recordingsResponse.status });
    }

    if (!file?.download_url || !file?.id) {
      await updateEvent(supabase, intakeEvent.id, {
        processing_status: 'received',
        processing_error: 'Recording received before a downloadable transcript file was available'
      });
      console.info('[Zoom Webhook] Recording awaiting transcript file', { meetingId, eventType });
      return res.status(200).json({ received: true });
    }

    const transcriptInfo = await fetch(
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/transcript`,
      { headers: { Authorization: `Bearer ${initialToken.accessToken}` } }
    );
    let transcriptDownloadUrl = file.download_url;
    if (transcriptInfo.ok) {
      const transcriptMetadata = await transcriptInfo.json();
      if (transcriptMetadata.download_url) transcriptDownloadUrl = transcriptMetadata.download_url;
    }

    const downloadResult = await downloadZoomTranscriptWithRetry(
      transcriptDownloadUrl,
      async ({ forceRefresh }) => forceRefresh ? getToken({ forceRefresh: true }) : initialToken
    );
    const download = downloadResult.response;
    if (!download.ok) throw new Error(`Zoom transcript download failed with ${download.status}`);

    const originalTranscript = await download.text();
    if (!originalTranscript.trim()) throw new Error('Zoom returned an empty transcript');

    const { error: transcriptError } = await supabase.from('zoom_transcripts').upsert({
      therapist_user_id: integration.user_id,
      zoom_meeting_id: meetingId,
      zoom_meeting_uuid: recording.uuid ? String(recording.uuid) : null,
      zoom_recording_file_id: String(file.id),
      original_format: String(file.file_extension || 'VTT').toUpperCase(),
      original_transcript: originalTranscript,
      source: 'zoom_cloud',
      client_id: sessionLink?.client_id || null,
      session_ref: sessionLink?.session_ref || null,
      status: sessionLink ? 'ready' : 'unassigned',
      updated_at: new Date().toISOString()
    }, { onConflict: 'therapist_user_id,zoom_recording_file_id' });
    if (transcriptError) throw transcriptError;

    if (sessionLink) {
      await supabase.from('zoom_session_links')
        .update({ status: 'transcript_received', updated_at: new Date().toISOString() })
        .eq('therapist_user_id', integration.user_id)
        .eq('zoom_meeting_id', meetingId);
    }

    await updateEvent(supabase, intakeEvent.id, { processing_status: 'stored' });
    console.info('[Zoom Webhook] Transcript stored', { meetingId, transcriptFileId: file.id, linkedToSession: Boolean(sessionLink) });
  } catch (error) {
    console.error('[Zoom Webhook] Intake failed', { message: error.message, meetingId, eventType });
  }

  return res.status(200).json({ received: true });
}
