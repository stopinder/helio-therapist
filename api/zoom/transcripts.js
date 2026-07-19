import { requireAuthenticatedUser } from '../_lib/supabase.js';

function serialiseTranscript(row) {
  return {
    id: row.id,
    meetingId: row.zoom_meeting_id,
    meetingUuid: row.zoom_meeting_uuid,
    format: row.original_format,
    text: row.original_transcript,
    status: row.status,
    clientId: row.client_id,
    receivedAt: row.received_at,
    updatedAt: row.updated_at,
    requestedLens: row.requested_lens,
    sourceRetention: row.source_retention
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('zoom_transcripts')
        .select('id, zoom_meeting_id, zoom_meeting_uuid, original_format, original_transcript, status, client_id, received_at, updated_at, requested_lens, source_retention')
        .eq('therapist_user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ transcripts: (data || []).map(serialiseTranscript) });
    }

    if (req.method === 'PATCH') {
      const { id, clientId, requestedLens, sourceRetention } = req.body || {};
      const allowedLenses = new Set(['clinical_summary', 'draft_note', 'cbt', 'ifs', 'supervision_reflection']);
      const allowedRetention = new Set(['keep_until_review', 'delete_after_approved_output']);
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'A transcript id is required.' });
      }

      if (clientId !== null && typeof clientId !== 'string') {
        return res.status(400).json({ error: 'Client id must be a client id or null.' });
      }
      if (requestedLens !== undefined && requestedLens !== null && !allowedLenses.has(requestedLens)) {
        return res.status(400).json({ error: 'Choose a supported clinical output.' });
      }
      if (sourceRetention !== undefined && !allowedRetention.has(sourceRetention)) {
        return res.status(400).json({ error: 'Choose a supported source-retention preference.' });
      }

      if (clientId) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('id', clientId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientError) throw clientError;
        if (!client) return res.status(404).json({ error: 'That client was not found.' });
      }

      const update = {
        client_id: clientId || null,
        status: clientId ? 'ready' : 'unassigned',
        updated_at: new Date().toISOString()
      };
      if (requestedLens !== undefined) update.requested_lens = requestedLens || null;
      if (sourceRetention !== undefined) update.source_retention = sourceRetention;

      const { data, error } = await supabase
        .from('zoom_transcripts')
        .update(update)
        .eq('id', id)
        .eq('therapist_user_id', user.id)
        .select('id, zoom_meeting_id, zoom_meeting_uuid, original_format, original_transcript, status, client_id, received_at, updated_at, requested_lens, source_retention')
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Transcript not found.' });

      return res.status(200).json({ transcript: serialiseTranscript(data) });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('[Zoom Transcript Inbox] Error:', error.message);
    return res.status(error.status || 500).json({ error: 'Unable to access the transcript inbox.' });
  }
}
