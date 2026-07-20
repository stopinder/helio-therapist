import { requireAuthenticatedUser } from '../_lib/supabase.js';

const transcriptFields = 'id, zoom_meeting_id, zoom_meeting_uuid, original_format, original_transcript, status, client_id, session_ref, received_at, updated_at, requested_lens, source_retention, review_choices_saved_at, completed_at';

function serialiseTranscript(row) {
  return {
    id: row.id,
    meetingId: row.zoom_meeting_id,
    meetingUuid: row.zoom_meeting_uuid,
    format: row.original_format,
    text: row.original_transcript,
    status: row.status,
    clientId: row.client_id,
    sessionRef: row.session_ref,
    receivedAt: row.received_at,
    updatedAt: row.updated_at,
    requestedLens: row.requested_lens,
    sourceRetention: row.source_retention,
    reviewChoicesSavedAt: row.review_choices_saved_at,
    completedAt: row.completed_at
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('zoom_transcripts')
        .select(transcriptFields)
        .eq('therapist_user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ transcripts: (data || []).map(serialiseTranscript) });
    }

    if (req.method === 'PATCH') {
      const { id, clientId, sessionRef, requestedLens, sourceRetention, reviewChoicesSaved, markComplete } = req.body || {};
      const allowedLenses = new Set(['clinical_summary', 'draft_note', 'cbt']);
      const allowedRetention = new Set(['keep_until_review', 'delete_after_approved_output']);

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'A transcript id is required.' });
      }
      if (clientId !== undefined && clientId !== null && typeof clientId !== 'string') {
        return res.status(400).json({ error: 'Client id must be a client id or null.' });
      }
      if (sessionRef !== undefined && sessionRef !== null && typeof sessionRef !== 'string') {
        return res.status(400).json({ error: 'Session reference must be a session id or null.' });
      }
      if (requestedLens !== undefined && requestedLens !== null && !allowedLenses.has(requestedLens)) {
        return res.status(400).json({ error: 'Choose a supported clinical output.' });
      }
      if (sourceRetention !== undefined && !allowedRetention.has(sourceRetention)) {
        return res.status(400).json({ error: 'Choose a supported source-retention preference.' });
      }
      if (reviewChoicesSaved !== undefined && typeof reviewChoicesSaved !== 'boolean') {
        return res.status(400).json({ error: 'Review choice state must be true or false.' });
      }
      if (markComplete !== undefined && typeof markComplete !== 'boolean') {
        return res.status(400).json({ error: 'Completion state must be true or false.' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('zoom_transcripts')
        .select('id, client_id, session_ref, review_choices_saved_at')
        .eq('id', id)
        .eq('therapist_user_id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'Transcript not found.' });

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

      const update = { updated_at: new Date().toISOString() };
      const clientChanged = clientId !== undefined && clientId !== existing.client_id;

      if (clientId !== undefined) {
        update.client_id = clientId || null;
        update.status = clientId ? 'ready' : 'unassigned';
      }

      // A new client assignment deliberately clears downstream review decisions.
      if (clientChanged) {
        update.session_ref = null;
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (sessionRef !== undefined) {
        const effectiveClientId = clientId !== undefined ? clientId : existing.client_id;
        if (sessionRef && !effectiveClientId) {
          return res.status(400).json({ error: 'Assign a client before linking a session.' });
        }
        update.session_ref = sessionRef || null;
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (requestedLens !== undefined) update.requested_lens = requestedLens || null;
      if (sourceRetention !== undefined) update.source_retention = sourceRetention;

      if (reviewChoicesSaved === true) {
        const effectiveSessionRef = sessionRef !== undefined ? sessionRef : existing.session_ref;
        if (!effectiveSessionRef) {
          return res.status(400).json({ error: 'Link a session before saving review choices.' });
        }
        update.review_choices_saved_at = new Date().toISOString();
        update.completed_at = null;
      }
      if (reviewChoicesSaved === false) {
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (markComplete === true) {
        const hasReviewChoices = reviewChoicesSaved === true || existing.review_choices_saved_at;
        const effectiveSessionRef = sessionRef !== undefined ? sessionRef : existing.session_ref;
        if (!effectiveSessionRef || !hasReviewChoices) {
          return res.status(400).json({ error: 'Save review choices before completing this transcript.' });
        }
        update.completed_at = new Date().toISOString();
      }
      if (markComplete === false) update.completed_at = null;

      const { data, error } = await supabase
        .from('zoom_transcripts')
        .update(update)
        .eq('id', id)
        .eq('therapist_user_id', user.id)
        .select(transcriptFields)
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
