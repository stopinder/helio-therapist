import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { resolveLensConfig } from '../_lib/clinical-lenses.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { buildTranscriptCbtCarePrompt, TRANSCRIPT_CBT_CARE_PROMPT_VERSION, validateCareSuggestions } from '../_lib/ai-care-suggestions.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const bodyKeys = Object.keys(req.body || {});
    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'transcriptId') return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Invalid request body' } });
    const transcriptId = String(req.body?.transcriptId || '');
    if (!UUID_PATTERN.test(transcriptId)) return res.status(400).json({ success:false, error:{ code:'INVALID_TRANSCRIPT_ID', message:'Invalid transcript ID format' } });

    const { data: transcript, error: transcriptError } = await supabase.from('zoom_transcripts').select('id, original_transcript, requested_lens, client_id, session_ref, review_choices_saved_at').eq('id', transcriptId).eq('therapist_user_id', user.id).maybeSingle();
    if (transcriptError) throw transcriptError;
    if (!transcript) return res.status(404).json({ success:false, error:{ code:'TRANSCRIPT_NOT_FOUND', message:'Transcript not found or access denied' } });
    if (transcript.requested_lens !== 'cbt' || !transcript.review_choices_saved_at) return res.status(409).json({ success:false, error:{ code:'CBT_NOT_REQUESTED', message:'Save CBT reflection as the transcript triage request before preparing suggestions.' } });
    if (!transcript.client_id || !transcript.session_ref) return res.status(409).json({ success:false, error:{ code:'TRANSCRIPT_NOT_LINKED', message:'Link this transcript to a client and session before preparing suggestions.' } });

    const { data: session, error: sessionError } = await supabase.from('sessions').select('id, client_id, user_id').eq('id', transcript.session_ref).eq('client_id', transcript.client_id).eq('user_id', user.id).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return res.status(409).json({ success:false, error:{ code:'SESSION_NOT_AVAILABLE', message:'Link this transcript to an owned session before preparing suggestions.' } });

    const lensConfig = resolveLensConfig('gentle_cbt');
    const { data: currentCare, error: careError } = await supabase.from('client_care_items').select('id, kind, body, status').eq('client_id', transcript.client_id).eq('therapist_id', user.id).neq('status', 'historical').order('updated_at', { ascending:false }).limit(30);
    if (careError) throw careError;

    const prompt = buildTranscriptCbtCarePrompt({ transcript:transcript.original_transcript, currentCare:currentCare || [], lensConfig });
    const { completion } = await runTextAI({ feature:AI_FEATURES.TRANSCRIPT_CBT_CARE_SUGGESTIONS, userId:user.id, promptVersion:TRANSCRIPT_CBT_CARE_PROMPT_VERSION, messages:[{role:'system',content:'Be concise, tentative, evidence-bound, clinically respectful, and preserve clinician agency. These are review suggestions, never a clinical record.'},{role:'user',content:prompt}], responseFormat:{type:'json_object'}, temperature:0.25, maxTokens:1400 });
    const validCareIds = new Set((currentCare || []).map(item => item.id));
    const suggestions = validateCareSuggestions(completion.choices?.[0]?.message?.content, { allowedKinds:lensConfig.allowedKinds, validCareIds, promptVersion:TRANSCRIPT_CBT_CARE_PROMPT_VERSION, defaultBasis:'session_transcript' });
    if (!suggestions) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'CBT Care suggestions are temporarily unavailable. Nothing has been saved.' } });
    return res.status(200).json({ success:true, data:{ suggestions, clientId:transcript.client_id, sessionId:transcript.session_ref, lensId:'gentle_cbt' } });
  } catch (error) {
    if (error.code === 'TRANSCRIPT_TOO_SHORT' || error.code === 'TRANSCRIPT_TOO_LONG') return res.status(error.status || 422).json({ success:false, error:{ code:error.code, message:error.message } });
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) return res.status(504).json({ success:false, error:{ code:'GATEWAY_TIMEOUT', message:'CBT Care suggestions are temporarily unavailable. Nothing has been saved.' } });
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'CBT Care suggestions are temporarily unavailable.' } });
    console.error('[Transcript CBT Care] Error:', error.message);
    const status=error.status || 500;
    return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':(error.code || 'INTERNAL_SERVER_ERROR'), message:status===401?'Please sign in again.':'CBT Care suggestions are temporarily unavailable. Nothing has been saved.' } });
  }
}
