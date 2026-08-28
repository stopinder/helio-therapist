import { createHash } from 'node:crypto';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

const transcriptFields = 'id, zoom_meeting_id, zoom_meeting_uuid, zoom_note_id, structured_transcript, original_format, original_transcript, source, status, client_id, session_ref, received_at, updated_at, requested_lens, source_retention, review_choices_saved_at, completed_at';
const MAX_MANUAL_TRANSCRIPT_BYTES = 2 * 1024 * 1024;
const MANUAL_SOURCE = 'zoom_manual';

function serialiseTranscript(row) {
  return {
    id: row.id,
    meetingId: row.zoom_meeting_id,
    meetingUuid: row.zoom_meeting_uuid,
    noteId: row.zoom_note_id,
    structuredTranscript: row.structured_transcript,
    format: row.original_format,
    text: row.original_transcript,
    source: row.source,
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

function normaliseManualImport({ filename, text }) {
  if (typeof filename !== 'string' || !filename.trim()) return { error: 'Choose a Zoom transcript file to import.' };
  if (typeof text !== 'string' || !text.trim()) return { error: 'That transcript file is empty.' };

  const cleanFilename = filename.trim();
  const extension = cleanFilename.split('.').pop()?.toLowerCase();
  if (!['vtt', 'txt'].includes(extension)) return { error: 'Import a Zoom transcript in .vtt or .txt format.' };
  if (Buffer.byteLength(text, 'utf8') > MAX_MANUAL_TRANSCRIPT_BYTES) return { error: 'That transcript file is too large to import.' };

  const fingerprintText = text.replace(/\r\n/g, '\n');
  const fingerprint = createHash('sha256').update(fingerprintText, 'utf8').digest('hex');
  const meetingIdMatch = cleanFilename.match(/(?:^|\D)(\d{9,11})(?:\D|$)/);

  return {
    filename: cleanFilename,
    text,
    format: extension.toUpperCase(),
    fingerprint,
    recordingFileId: `manual:${fingerprint}`,
    meetingId: meetingIdMatch?.[1] || `manual-${fingerprint.slice(0, 12)}`
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);

    if (req.method === 'GET') {
      const { sessionRef, clientId } = req.query || {};
      const hasSessionFilter = sessionRef !== undefined || clientId !== undefined;
      if (hasSessionFilter && (typeof sessionRef !== 'string' || !sessionRef.trim() || typeof clientId !== 'string' || !clientId.trim())) {
        return res.status(400).json({ error: 'Session and client ids are required together.' });
      }

      let query = supabase.from('zoom_transcripts').select(transcriptFields).eq('therapist_user_id', user.id);
      if (hasSessionFilter) query = query.eq('session_ref', sessionRef).eq('client_id', clientId);
      const { data, error } = await query.order('received_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ transcripts: (data || []).map(serialiseTranscript) });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'A transcript id is required.' });

      const { data: existing, error: existingError } = await supabase.from('zoom_transcripts').select('id, therapist_user_id, status, client_id, session_ref, review_choices_saved_at, completed_at').eq('id', id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'Transcript not found.' });

      if (existing.therapist_user_id !== user.id) {
        return res.status(404).json({ error: 'Transcript not found.' });
      }

      const isUnassigned = 
        existing.status === 'unassigned' &&
        existing.client_id === null &&
        existing.session_ref === null &&
        existing.review_choices_saved_at === null &&
        existing.completed_at === null;

      if (!isUnassigned) {
        return res.status(403).json({ error: 'This transcript has already been assigned or reviewed and cannot be deleted.' });
      }

      const { error: deleteError } = await supabase.from('zoom_transcripts').delete().eq('id', id).eq('therapist_user_id', user.id);
      if (deleteError) throw deleteError;

      return res.status(204).end();
    }

    if (req.method === 'POST') {
      const manualImport = normaliseManualImport(req.body || {});
      if (manualImport.error) return res.status(400).json({ error: manualImport.error });

      const { data: existing, error: existingError } = await supabase.from('zoom_transcripts').select(transcriptFields).eq('therapist_user_id', user.id).eq('zoom_recording_file_id', manualImport.recordingFileId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return res.status(200).json({ transcript: serialiseTranscript(existing), duplicate: true });

      const now = new Date().toISOString();
      const { data, error } = await supabase.from('zoom_transcripts').insert({
        therapist_user_id: user.id,
        zoom_meeting_id: manualImport.meetingId,
        zoom_meeting_uuid: null,
        zoom_recording_file_id: manualImport.recordingFileId,
        original_format: manualImport.format,
        original_transcript: manualImport.text,
        source: MANUAL_SOURCE,
        status: 'unassigned',
        source_retention: 'keep_until_review',
        received_at: now,
        updated_at: now
      }).select(transcriptFields).single();
      if (error) throw error;
      return res.status(201).json({ transcript: serialiseTranscript(data), duplicate: false });
    }

    if (req.method === 'PATCH') {
      const { id, expectedUpdatedAt, clientId, sessionRef, requestedLens, sourceRetention, reviewChoicesSaved, markComplete } = req.body || {};
      const allowedLenses = new Set(['clinical_summary', 'draft_note', 'cbt']);
      const allowedRetention = new Set(['keep_until_review', 'delete_after_approved_output']);

      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'A transcript id is required.' });
      if (clientId !== undefined && clientId !== null && typeof clientId !== 'string') return res.status(400).json({ error: 'Client id must be a client id or null.' });
      if (sessionRef !== undefined && sessionRef !== null && typeof sessionRef !== 'string') return res.status(400).json({ error: 'Session reference must be a session id or null.' });
      if (requestedLens !== undefined && requestedLens !== null && !allowedLenses.has(requestedLens)) return res.status(400).json({ error: 'Choose a supported clinical output.' });
      if (sourceRetention !== undefined && !allowedRetention.has(sourceRetention)) return res.status(400).json({ error: 'Choose a supported source-retention preference.' });
      if (reviewChoicesSaved !== undefined && typeof reviewChoicesSaved !== 'boolean') return res.status(400).json({ error: 'Review choice state must be true or false.' });
      if (markComplete !== undefined && typeof markComplete !== 'boolean') return res.status(400).json({ error: 'Completion state must be true or false.' });

      const { data: existing, error: existingError } = await supabase.from('zoom_transcripts').select('id, client_id, session_ref, review_choices_saved_at, updated_at').eq('id', id).eq('therapist_user_id', user.id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'Transcript not found.' });
      if (!expectedUpdatedAt || typeof expectedUpdatedAt !== 'string') return res.status(400).json({ error: 'Reload this transcript before saving changes.' });
      if (existing.updated_at !== expectedUpdatedAt) return res.status(409).json({ error: 'This transcript changed in another tab or window. Reload it before saving so newer work is not overwritten.' });

      if (clientId) {
        const { data: client, error: clientError } = await supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle();
        if (clientError) throw clientError;
        if (!client) return res.status(404).json({ error: 'That client was not found.' });
      }

      const validateSession = async (ref, effectiveClientId) => {
        if (!ref || !effectiveClientId) return false;
        const { data: session, error: sessionError } = await supabase.from('sessions').select('id').eq('id', ref).eq('client_id', effectiveClientId).eq('user_id', user.id).maybeSingle();
        if (sessionError) throw sessionError;
        return Boolean(session);
      };

      const update = { updated_at: new Date().toISOString() };
      const clientChanged = clientId !== undefined && clientId !== existing.client_id;
      if (clientId !== undefined) {
        update.client_id = clientId || null;
        update.status = clientId ? 'ready' : 'unassigned';
      }
      if (clientChanged) {
        update.session_ref = null;
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (sessionRef !== undefined) {
        const effectiveClientId = clientId !== undefined ? clientId : existing.client_id;
        if (sessionRef && !effectiveClientId) return res.status(400).json({ error: 'Assign a client before linking a session.' });
        if (sessionRef && !(await validateSession(sessionRef, effectiveClientId))) return res.status(404).json({ error: 'That session was not found for this client.' });
        update.session_ref = sessionRef || null;
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (requestedLens !== undefined) update.requested_lens = requestedLens || null;
      if (sourceRetention !== undefined) update.source_retention = sourceRetention;

      const effectiveClientId = clientId !== undefined ? clientId : existing.client_id;
      const effectiveSessionRef = sessionRef !== undefined ? sessionRef : (clientChanged ? null : existing.session_ref);

      if (reviewChoicesSaved === true) {
        if (!effectiveSessionRef) return res.status(400).json({ error: 'Link a session before saving review choices.' });
        if (!(await validateSession(effectiveSessionRef, effectiveClientId))) return res.status(409).json({ error: 'This transcript is linked to an unavailable session. Link it to a current session before saving review choices.' });
        update.review_choices_saved_at = new Date().toISOString();
        update.completed_at = null;
      }
      if (reviewChoicesSaved === false) {
        update.review_choices_saved_at = null;
        update.completed_at = null;
      }

      if (markComplete === true) {
        const hasReviewChoices = reviewChoicesSaved === true || existing.review_choices_saved_at;
        if (!effectiveSessionRef || !hasReviewChoices) return res.status(400).json({ error: 'Save review choices before completing this transcript.' });
        if (!(await validateSession(effectiveSessionRef, effectiveClientId))) return res.status(409).json({ error: 'This transcript is linked to an unavailable session. Link it to a current session before completing this transcript.' });
        update.completed_at = new Date().toISOString();
      }
      if (markComplete === false) update.completed_at = null;

      const { data, error } = await supabase.from('zoom_transcripts').update(update).eq('id', id).eq('therapist_user_id', user.id).eq('updated_at', expectedUpdatedAt).select(transcriptFields).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ error: 'This transcript changed while you were saving. Reload it before trying again.' });
      return res.status(200).json({ transcript: serialiseTranscript(data) });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('[Zoom Transcript Inbox] Error:', error.message);
    return res.status(error.status || 500).json({ error: 'Unable to access the transcript inbox.' });
  }
}
