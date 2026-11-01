import { clientSessionSummaryLensRule } from './ai-client-session-summary.js';

export const ASK_HELIOS_CLINICAL_PROMPT_VERSION = 'ask-helios-clinical/1.0.0';
export const ASK_HELIOS_CLINICAL_WINDOWS = Object.freeze(['current','last_three','last_five','history']);
export const ASK_HELIOS_CLINICAL_LENSES = Object.freeze(['general','integrative','gentle_cbt','internal_family_systems','transactional_analysis']);

const MAX_CONTEXT_CHARS = 2800;
const SAFE_CARE_KINDS = new Set(['current_focus','shared_understanding','trying','change_noticed','learning','themes','interventions','outcomes']);

function clean(value, max = 1000) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text;
}
function occurredAt(row) { return row?.occurred_at || row?.source_occurred_at || ''; }
function windowCount(window) { return window === 'current' ? 1 : window === 'last_three' ? 3 : window === 'last_five' ? 5 : null; }
function bodyFromCapture(capture) {
  if (!capture?.content || typeof capture.content !== 'object') return '';
  const entries = Object.entries(capture.content)
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([key, value]) => `${key}: ${value.trim()}`);
  return entries.join('\n');
}
function summarySessionId(document, transcriptSessionById) {
  const manifest = Array.isArray(document?.source_manifest) ? document.source_manifest : [];
  const source = manifest.find(item => item?.kind === 'zoom_transcript' && (item?.sessionId || item?.id));
  return source ? String(source.sessionId || transcriptSessionById.get(String(source.id || '')) || '') : '';
}
function compactSourceText(text, maxChars) {
  const value = String(text || '').trim();
  const limit = Math.max(0, Math.floor(Number(maxChars) || 0));
  if (!value || limit === 0) return '';
  if (value.length <= limit) return value;
  const marker = '\n…[source compacted]…\n';
  if (limit <= marker.length + 2) return value.slice(0, limit);
  const side = Math.max(1, Math.floor((limit - marker.length) / 2));
  return value.slice(0, side) + marker + value.slice(-side);
}
async function paged(queryFactory, pageSize = 200) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function loadAskHeliosClinicalContext({ supabase, userId, clientId, anchorSessionId = null, window = 'last_three' }) {
  if (!ASK_HELIOS_CLINICAL_WINDOWS.includes(window)) {
    const error = new Error('Choose a supported clinical evidence window.'); error.status = 400; throw error;
  }
  const { data: client, error: clientError } = await supabase.from('clients')
    .select('id,display_name,reference,current_focus,preferred_summary_lens')
    .eq('id', clientId).eq('user_id', userId).maybeSingle();
  if (clientError) throw clientError;
  if (!client) { const error = new Error('Client not found in your workspace.'); error.status = 404; throw error; }

  const sessions = await paged((from, to) => supabase.from('sessions')
    .select('id,occurred_at,status,workflow_status')
    .eq('client_id', clientId).eq('user_id', userId)
    .order('occurred_at', { ascending: false }).range(from, to));
  if (!sessions.length) { const error = new Error('No sessions are available for this client.'); error.status = 409; throw error; }

  const anchor = anchorSessionId ? sessions.find(item => String(item.id) === String(anchorSessionId)) : sessions[0];
  if (!anchor) { const error = new Error('That session is not available for this client.'); error.status = 404; throw error; }
  const eligible = sessions.filter(item => String(occurredAt(item)) <= String(occurredAt(anchor)));
  const limit = windowCount(window);
  const selectedSessions = limit === null ? eligible : eligible.slice(0, limit);
  const sessionIds = selectedSessions.map(item => item.id);

  const [captures, transcripts, documents, careItems] = await Promise.all([
    sessionIds.length ? supabase.from('session_capture_drafts')
      .select('session_id,content,reviewed_at')
      .eq('client_id', clientId).eq('user_id', userId).eq('status', 'reviewed')
      .in('session_id', sessionIds) : Promise.resolve({ data: [], error: null }),
    sessionIds.length ? supabase.from('zoom_transcripts')
      .select('id,session_ref,source_occurred_at,zoom_generated_summary,original_transcript')
      .eq('client_id', clientId).eq('therapist_user_id', userId).is('deleted_at', null)
      .in('session_ref', sessionIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('documents')
      .select('id,status,content,source_manifest,created_at,updated_at')
      .eq('client_id', clientId).eq('user_id', userId).eq('document_type', 'session_summary')
      .is('archived_at', null).order('updated_at', { ascending: false }).limit(200),
    supabase.from('client_care_items')
      .select('id,kind,body,status,updated_at')
      .eq('client_id', clientId).eq('therapist_id', userId).eq('status', 'current')
      .order('updated_at', { ascending: false }).limit(20)
  ]);
  for (const result of [captures, transcripts, documents, careItems]) if (result.error) throw result.error;

  const captureBySession = new Map((captures.data || []).map(row => [String(row.session_id), row]));
  const transcriptBySession = new Map();
  const transcriptSessionById = new Map();
  for (const row of transcripts.data || []) {
    const sessionId = String(row.session_ref || '');
    if (sessionId && !transcriptBySession.has(sessionId)) transcriptBySession.set(sessionId, row);
    if (row.id && sessionId) transcriptSessionById.set(String(row.id), sessionId);
  }
  const documentBySession = new Map();
  for (const document of documents.data || []) {
    const sessionId = summarySessionId(document, transcriptSessionById);
    const body = typeof document?.content?.body === 'string' ? document.content.body.trim() : '';
    if (sessionId && body && !documentBySession.has(sessionId)) documentBySession.set(sessionId, document);
  }

  const priorCount = Math.max(0, selectedSessions.length - 1);
  const anchorBudget = selectedSessions.length === 1 ? MAX_CONTEXT_CHARS : Math.min(3200, Math.floor(MAX_CONTEXT_CHARS * 0.46));
  const priorBudget = priorCount ? Math.max(0, Math.floor((MAX_CONTEXT_CHARS - anchorBudget) / priorCount)) : 0;

  const sources = selectedSessions.map((session, index) => {
    const sessionId = String(session.id);
    const capture = captureBySession.get(sessionId);
    const transcript = transcriptBySession.get(sessionId);
    const document = documentBySession.get(sessionId);
    let sourceType = 'session_metadata';
    let raw = '';
    let sourceId = `session:${sessionId}`;
    if (capture) {
      sourceType = 'reviewed_session_capture';
      raw = bodyFromCapture(capture);
    } else if (index === 0 && transcript?.original_transcript) {
      sourceType = 'linked_transcript';
      raw = [transcript.zoom_generated_summary, transcript.original_transcript].filter(Boolean).join('\n\n');
    } else if (document?.content?.body) {
      sourceType = 'transcript_backed_session_summary';
      raw = document.content.body;
      sourceId = `document:${document.id}`;
    } else if (transcript?.zoom_generated_summary) {
      sourceType = 'zoom_summary';
      raw = transcript.zoom_generated_summary;
    } else if (transcript?.original_transcript) {
      sourceType = 'transcript_excerpt';
      raw = transcript.original_transcript;
    }
    return {
      id: sourceId,
      sessionId,
      occurredAt: session.occurred_at,
      sourceType,
      content: compactSourceText(raw, index === 0 ? anchorBudget : priorBudget)
    };
  });

  const care = (careItems.data || []).filter(item => item?.body && SAFE_CARE_KINDS.has(item.kind)).slice(0, 4)
    .map(item => ({ id: `care:${item.id}`, kind: item.kind, content: clean(item.body, 250) }));

  return {
    client: { id: client.id, displayName: client.display_name || 'Client', reference: client.reference || null, currentFocus: clean(client.current_focus, 300), preferredLens: client.preferred_summary_lens || 'integrative' },
    anchorSessionId: String(anchor.id),
    window,
    sourceCount: sources.length,
    sources,
    care,
    references: sources.map(source => ({
      title: new Date(source.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' session',
      url: `/clients/${client.id}/sessions/${source.sessionId}`,
      citation: source.sourceType.replaceAll('_', ' ')
    }))
  };
}

export function askHeliosClinicalSystemPrompt(lens = 'integrative') {
  return `You are Ask Helios, a clinical thinking assistant for a qualified therapist. The therapist has explicitly selected the client/session evidence supplied in this request. Help the therapist understand what may be happening without replacing their judgement or acting as a supervisor.

Separate what is recorded from what is inferred. Do not diagnose, invent trauma history, infer risk, motivation or causality, or present a formulation as fact unless the evidence explicitly establishes it. When the evidence is weak or mixed, say so. Consider at least one plausible alternative explanation when offering an interpretation. Prefer patterns supported across multiple sessions over isolated details. Treat prior summaries as compressed secondary evidence, not verbatim client speech.

The selected therapeutic perspective is a thinking lens, not a conclusion:
${clientSessionSummaryLensRule(lens)}

Return practical clinical thinking for the therapist, not client-facing copy. Do not write or update the clinical record. Do not prescribe a treatment plan. Questions for consideration should be genuinely useful for the next session and should not assume your interpretation is correct.`;
}

export function askHeliosClinicalResponseFormat() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'ask_helios_clinical_reasoning',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          recordedContext: { type: 'string' },
          clinicalInterpretation: { type: 'string' },
          alternativePossibilities: { type: 'string' },
          therapistAttention: { type: 'string' },
          questionsForConsideration: { type: 'array', items: { type: 'string' }, maxItems: 5 }
        },
        required: ['recordedContext','clinicalInterpretation','alternativePossibilities','therapistAttention','questionsForConsideration'],
        additionalProperties: false
      }
    }
  };
}

export function buildAskHeliosClinicalInput({ query, lens, context }) {
  return JSON.stringify({
    task: 'Help the therapist think about the selected client/session evidence.',
    therapistQuestion: String(query || '').trim(),
    selectedPerspective: lens,
    evidenceWindow: context.window,
    anchorSessionId: context.anchorSessionId,
    clientContext: {
      currentFocus: context.client.currentFocus,
      care: context.care
    },
    sessionEvidence: context.sources.map(source => ({
      id: source.id,
      sessionId: source.sessionId,
      occurredAt: source.occurredAt,
      sourceType: source.sourceType,
      content: source.content
    }))
  });
}

export function renderAskHeliosClinicalAnswer(result) {
  const questions = Array.isArray(result?.questionsForConsideration) ? result.questionsForConsideration.filter(Boolean) : [];
  return [
    'Recorded context',
    String(result?.recordedContext || '').trim(),
    '',
    'Clinical interpretation',
    String(result?.clinicalInterpretation || '').trim(),
    '',
    'Alternative possibilities',
    String(result?.alternativePossibilities || '').trim(),
    '',
    'What may deserve your attention',
    String(result?.therapistAttention || '').trim(),
    '',
    'Questions for consideration',
    ...(questions.length ? questions.map(item => '• ' + String(item).trim()) : ['• No additional question was generated.'])
  ].join('\n').trim();
}
