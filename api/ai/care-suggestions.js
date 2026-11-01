import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { loadOwnedClientAIContext } from '../_lib/client-ai-context.js';
import { resolveLensConfig } from '../_lib/clinical-lenses.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { buildCareSuggestionsPrompt, CARE_SUGGESTIONS_PROMPT_VERSION, validateCareSuggestions } from '../_lib/ai-care-suggestions.js';
import { buildClinicalIntelligenceSessionCandidates, selectClinicalIntelligenceSources } from '../_lib/ai-client-session-summary.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOWS = new Set(['current', 'last_three', 'last_five', 'history']);
const SOURCE_MODES = new Set(['reflection', 'history']);
const REVIEW_GOALS = new Set(['fill_empty', 'review_updates']);

function windowLimit(window) {
  if (window === 'current') return 1;
  if (window === 'last_five') return 5;
  if (window === 'history') return null;
  return 3;
}

async function loadHistorySources(supabase, { clientId, userId, window }) {
  const pageSize = 200;
  const captures = [];
  const summaryDocuments = [];
  const sessions = [];
  const transcriptRows = [];

  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from('session_capture_drafts')
      .select('session_id,content,reviewed_at,sessions!inner(id,occurred_at,user_id,client_id)')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .eq('status', 'reviewed')
      .not('reviewed_at', 'is', null)
      .order('reviewed_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    captures.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }

  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from('documents')
      .select('id,status,content,source_manifest,created_at,updated_at')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .eq('document_type', 'session_summary')
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    summaryDocuments.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }

  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from('sessions')
      .select('id,occurred_at')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    sessions.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }

  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from('zoom_transcripts')
      .select('id,session_ref')
      .eq('client_id', clientId)
      .eq('therapist_user_id', userId)
      .is('deleted_at', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    transcriptRows.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }

  const candidates = buildClinicalIntelligenceSessionCandidates({ captures, summaryDocuments, sessions, transcriptRows });
  return selectClinicalIntelligenceSources(candidates, { limit: windowLimit(window) }).map(row => ({
    id: `session:${row.session_id}`,
    sessionId: row.session_id,
    occurredAt: row.sessions?.occurred_at || null,
    reviewedAt: row.reviewed_at || null,
    sourceType: row.evidence_source === 'session_summary' ? 'transcript_backed_session_summary' : 'reviewed_session_capture',
    content: row.content || {}
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } });

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const clientId = String(req.body?.clientId || '').trim();
    const input = String(req.body?.input || '').trim();
    const steering = String(req.body?.steering || '').trim();
    const lensId = String(req.body?.lensId || '').trim();
    const sourceMode = String(req.body?.sourceMode || 'reflection').trim();
    const window = String(req.body?.window || 'last_three').trim();
    const reviewGoal = String(req.body?.reviewGoal || 'review_updates').trim();

    if (!UUID_PATTERN.test(clientId)) return res.status(400).json({ success:false, error:{ code:'INVALID_CLIENT_ID', message:'Open a valid client before asking Helios for Therapy Focus suggestions.' } });
    if (!SOURCE_MODES.has(sourceMode) || !WINDOWS.has(window) || !REVIEW_GOALS.has(reviewGoal)) return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Choose a valid Therapy Focus review mode and evidence window.' } });
    if (sourceMode === 'reflection' && !input) return res.status(400).json({ success:false, error:{ code:'INPUT_REQUIRED', message:'Add a therapist reflection before generating suggestions.' } });
    if (input.length > 6000) return res.status(400).json({ success:false, error:{ code:'INPUT_TOO_LONG', message:'Please shorten this reflection before generating suggestions.' } });

    const { data: ownedClient, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!ownedClient) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found.' } });

    const { data: currentFocus, error: focusError } = await supabase
      .from('client_care_items')
      .select('id,kind,body,status,origin,provenance_session_id')
      .eq('client_id', clientId)
      .eq('therapist_id', user.id)
      .neq('status', 'historical')
      .order('updated_at', { ascending:false })
      .limit(30);
    if (focusError) throw focusError;

    const lensConfig = resolveLensConfig(lensId);
    let approvedContext = '';
    let historySources = [];
    let contextVersion = 'therapy-focus-reflection-v1';

    if (sourceMode === 'history') {
      historySources = await loadHistorySources(supabase, { clientId, userId:user.id, window });
      if (!historySources.length) {
        return res.status(409).json({
          success:false,
          error:{
            code:'NO_THERAPY_FOCUS_EVIDENCE',
            message:'No reviewed Session Capture or transcript-backed session summary is available yet.'
          }
        });
      }
      contextVersion = 'therapy-focus-history-v1';
    } else {
      const context = await loadOwnedClientAIContext(supabase, { clientId, userId:user.id });
      approvedContext = (context?.sessions || []).map((session, index) => `Approved session ${index + 1}: ${session.content}`).join('\n');
      contextVersion = context?.version || contextVersion;
    }

    const prompt = buildCareSuggestionsPrompt({
      lensConfig,
      input,
      steering,
      currentCare: currentFocus || [],
      approvedContext,
      sourceMode,
      reviewGoal,
      window,
      historySources
    });

    const { completion } = await runTextAI({
      feature: AI_FEATURES.CARE_SUGGESTIONS,
      userId: user.id,
      promptVersion: CARE_SUGGESTIONS_PROMPT_VERSION,
      messages:[
        {role:'system',content:'Be concise, tentative, clinically respectful, preserve psychotherapist agency, and prefer updating an existing working understanding only when the meaning has genuinely evolved.'},
        {role:'user',content:prompt}
      ],
      responseFormat:{type:'json_object'},
      temperature:0.35,
      maxTokens:1800
    });

    const validCareIds = new Set((currentFocus || []).map(item => item?.id).filter(Boolean));
    const validSourceIds = sourceMode === 'history' ? new Set(historySources.map(source => source.id)) : null;
    const suggestions = validateCareSuggestions(completion.choices?.[0]?.message?.content, {
      allowedKinds:lensConfig.allowedKinds,
      validCareIds,
      validSourceIds,
      promptVersion:CARE_SUGGESTIONS_PROMPT_VERSION,
      defaultBasis:sourceMode === 'history' ? 'clinical_history' : 'therapist_input'
    });
    if (!suggestions) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Helios could not prepare Therapy Focus suggestions just now. Nothing has been saved.' } });

    return res.status(200).json({
      success:true,
      suggestions,
      contextVersion,
      promptVersion:CARE_SUGGESTIONS_PROMPT_VERSION,
      sourceMode,
      window,
      reviewGoal,
      sources:historySources.map(({ id, sessionId, occurredAt, reviewedAt, sourceType }) => ({ id, sessionId, occurredAt, reviewedAt, sourceType }))
    });
  } catch (error) {
    console.error('[Therapy Focus suggestions] failed', error.message);
    const status = error.status || 500;
    const unavailable = error.code === 'AI_PROVIDER_NOT_CONFIGURED' || error.name === 'OpenAIConnectionTimeoutError';
    return res.status(unavailable ? (error.status || 503) : status).json({
      success:false,
      error:{
        code:status===401?'UNAUTHORIZED':'THERAPY_FOCUS_SUGGESTIONS_FAILED',
        message:status===401?'Please sign in again.':'Helios could not prepare Therapy Focus suggestions just now. Nothing has been saved.'
      }
    });
  }
}
