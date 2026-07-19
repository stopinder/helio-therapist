import crypto from 'crypto';
import { getSupabaseClient } from '../_lib/supabase.js';
import { getUsableZoomAccessToken } from '../_lib/zoom-oauth.js';

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
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

  const body = getBody(req);

  // Zoom calls this when the endpoint is saved. It proves Helio controls the URL.
  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken;
    if (!plainToken) return res.status(400).json({ error: 'Missing Zoom validation token' });

    const encryptedToken = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    return res.status(200).json({ plainToken, encryptedToken });
  }

  const recording = body.payload?.object || {};
  const eventType = body.event || 'unknown';
  const meetingId = recording.id ? String(recording.id) : null;
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
        event_type: eventType,
        zoom_meeting_id: meetingId,
        zoom_host_id: hostId,
        payload: body
      })
      .select('id')
      .single();

    if (intakeError) throw intakeError;

    if (eventType !== 'recording.transcript_completed') {
      return res.status(200).json({ received: true });
    }

    const file = transcriptFile(recording);
    if (!file?.download_url || !file?.id || !hostId || !meetingId) {
      await updateEvent(supabase, intakeEvent.id, {
        processing_status: 'failed',
        processing_error: 'Transcript event did not contain a downloadable file or host id'
      });
      return res.status(200).json({ received: true });
    }

    const integrationFields =
      'user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope';

    const { data: matchedIntegration, error: integrationError } = await supabase
      .from('integrations')
      .select(integrationFields)
      .eq('provider', 'zoom')
      .eq('provider_account_id', hostId)
      .maybeSingle();

    if (integrationError) throw integrationError;

    let integration = matchedIntegration;

    // Some Zoom user-managed apps do not expose the user identity scope, so
    // provider_account_id cannot be recorded at OAuth time. For the one-user
    // MVP we can still safely accept a webhook only when Helio has exactly one
    // Zoom integration. We deliberately do not make this fallback when two or
    // more therapists have connected Zoom.
    if (!integration) {
      const { data: zoomIntegrations, error: fallbackError } = await supabase
        .from('integrations')
        .select(integrationFields)
        .eq('provider', 'zoom')
        .limit(2);

      if (fallbackError) throw fallbackError;

      if (zoomIntegrations?.length === 1) {
        integration = zoomIntegrations[0];
        console.info('[Zoom Webhook] Using single-therapist MVP account fallback', {
          meetingId,
          hostId
        });
      }
    }

    // A transcript is never guessed onto a client. A client/session link is
    // created later by Start Session, after this raw transcript is safely held.
    if (!integration) {
      await updateEvent(supabase, intakeEvent.id, {
        processing_status: 'unmatched',
        processing_error: 'No connected Helio therapist matched this Zoom host'
      });
      console.warn('[Zoom Webhook] Transcript awaiting account match', { meetingId, hostId });
      return res.status(200).json({ received: true });
    }

    // Zoom includes a short-lived download token on recording webhook events.
    // It is the preferred credential for this specific download. Fall back to
    // the connected OAuth token only for older payloads that omit it.
    const downloadToken = body.payload?.download_token;
    const accessToken = downloadToken || await getUsableZoomAccessToken(supabase, integration);
    console.info('[Zoom Webhook] Downloading transcript', {
      meetingId,
      credential: downloadToken ? 'event-download-token' : 'oauth-access-token'
    });

    // Some webhook payloads provide a recording-file URL that is not usable
    // with a granular transcript scope. Ask Zoom's dedicated transcript API
    // for the canonical URL before downloading.
    let transcriptDownloadUrl = file.download_url;
    if (!downloadToken) {
      const transcriptInfo = await fetch(
        `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/transcript`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (transcriptInfo.ok) {
        const transcriptMetadata = await transcriptInfo.json();
        if (transcriptMetadata.download_url) {
          transcriptDownloadUrl = transcriptMetadata.download_url;
          console.info('[Zoom Webhook] Using dedicated transcript download URL', { meetingId });
        }
      } else {
        const reason = await transcriptInfo.text().catch(() => '');
        console.warn('[Zoom Webhook] Dedicated transcript lookup unavailable', {
          meetingId,
          status: transcriptInfo.status,
          reason: reason.slice(0, 240)
        });
      }
    }

    // The download URL redirects to a file host. Node's fetch removes an
    // Authorization header across hosts, so use Zoom's documented query-token
    // form; the redirected request then remains authorised.
    const authorisedDownloadUrl = new URL(transcriptDownloadUrl);
    authorisedDownloadUrl.searchParams.set('access_token', accessToken);

    const download = await fetch(authorisedDownloadUrl, {
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!download.ok) {
      throw new Error(`Zoom transcript download failed with ${download.status}`);
    }

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
      status: 'unassigned',
      updated_at: new Date().toISOString()
    }, { onConflict: 'therapist_user_id,zoom_recording_file_id' });

    if (transcriptError) throw transcriptError;

    await updateEvent(supabase, intakeEvent.id, { processing_status: 'stored' });
    console.info('[Zoom Webhook] Transcript stored as unassigned', {
      meetingId,
      transcriptFileId: file.id
    });
  } catch (error) {
    console.error('[Zoom Webhook] Intake failed', { message: error.message, meetingId, eventType });
  }

  // Acknowledge promptly so Zoom does not retry while Helio records the failure.
  return res.status(200).json({ received: true });
}
