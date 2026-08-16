import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import {
  buildClinicalSummaryInput,
  clinicalSummarySystemPrompt,
  CLINICAL_SUMMARY_PROMPT_VERSION,
  validateClinicalSummaryResponse
} from '../_lib/ai-clinical-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const bodyKeys = Object.keys(req.body || {});
    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'transcriptId') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request body' } });
    }

    const { transcriptId } = req.body;
    if (!transcriptId || typeof transcriptId !== 'string' || !/^[0-9a-f-]{36}$/i.test(transcriptId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSCRIPT_ID', message: 'Invalid transcript ID format' } });
    }

    const { data: transcript, error: transcriptError } = await supabase
      .from('zoom_transcripts')
      .select('id, original_transcript, requested_lens, client_id, session_ref, review_choices_saved_at')
      .eq('id', transcriptId)
      .eq('therapist_user_id', user.id)
      .maybeSingle();
    if (transcriptError) throw transcriptError;
    if (!transcript) return res.status(404).json({ success: false, error: { code: 'TRANSCRIPT_NOT_FOUND', message: 'Transcript not found or access denied' } });
    if (transcript.requested_lens !== 'clinical_summary' || !transcript.review_choices_saved_at) {
      return res.status(409).json({ success: false, error: { code: 'CLINICAL_SUMMARY_NOT_REQUESTED', message: 'Save Clinical summary as the transcript triage request before preparing a draft.' } });
    }
    if (!transcript.client_id || !transcript.session_ref) {
      return res.status(409).json({ success: false, error: { code: 'TRANSCRIPT_NOT_LINKED', message: 'Link this transcript to a client and session before preparing a draft.' } });
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, client_id, user_id, status, notes')
      .eq('id', transcript.session_ref)
      .eq('client_id', transcript.client_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return res.status(409).json({ success: false, error: { code: 'SESSION_NOT_AVAILABLE', message: 'Link this transcript to a current session before preparing a draft.' } });
    if (session.status === 'completed') {
      return res.status(409).json({ success: false, error: { code: 'CLINICAL_RECORD_ALREADY_APPROVED', message: 'This session already has an approved Clinical Record.' } });
    }
    if (String(session.notes || '').trim()) {
      return res.status(409).json({ success: false, error: { code: 'CLINICAL_DRAFT_EXISTS', message: 'A Clinical Summary draft already exists. Open Clinical Record to continue reviewing it.' } });
    }

    const input = buildClinicalSummaryInput(transcript.original_transcript);
    const { completion } = await runTextAI({
      feature: AI_FEATURES.TRANSCRIPT_CLINICAL_SUMMARY,
      userId: user.id,
      promptVersion: CLINICAL_SUMMARY_PROMPT_VERSION,
      messages: [
        { role: 'system', content: clinicalSummarySystemPrompt },
        { role: 'user', content: input }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
      maxTokens: 1400
    });

    const draft = validateClinicalSummaryResponse(completion.choices?.[0]?.message?.content);
    if (!draft) {
      return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'Clinical summary drafting is temporarily unavailable.' } });
    }

    return res.status(200).json({ success: true, data: { draft } });
  } catch (error) {
    if (error.code === 'TRANSCRIPT_TOO_SHORT' || error.code === 'TRANSCRIPT_TOO_LONG') {
      return res.status(error.status || 422).json({ success: false, error: { code: error.code, message: error.message } });
    }
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) {
      return res.status(504).json({ success: false, error: { code: 'GATEWAY_TIMEOUT', message: 'Clinical summary drafting is temporarily unavailable. Nothing has been saved.' } });
    }
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Clinical summary drafting is temporarily unavailable.' } });
    }
    console.error('[Transcript Clinical Summary] Error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : (error.code || 'INTERNAL_SERVER_ERROR'), message: status === 401 ? 'Please sign in again.' : 'Clinical summary drafting is temporarily unavailable. Nothing has been saved.' } });
  }
}
