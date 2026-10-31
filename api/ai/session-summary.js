import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import {
  CLIENT_SESSION_SUMMARY_LENSES,
  clientSessionSummaryLensRule,
  clientSessionSummaryResponseFormat,
  normalizeClientSessionSummaryResponse,
  renderClientSessionSummary,
  validateClientSessionSummaryResponse
} from '../_lib/ai-client-session-summary.js';

const SUMMARY_WINDOWS = new Set(['current', 'recent']);
const PROMPT_VERSION = 'session-summary-direct-v4';

function sourceHasMaterial(source) {
  return Boolean(source?.original_transcript || source?.zoom_generated_summary);
}

const PREVIOUS_TRANSCRIPT_EXCERPT_CHARS = 12000;

function boundedTranscriptExcerpt(value, maxChars = PREVIOUS_TRANSCRIPT_EXCERPT_CHARS) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length <= maxChars) return text;
  const marker = '\n...[middle omitted for continuity evidence]...\n';
  const side = Math.max(1, Math.floor((maxChars - marker.length) / 2));
  return `${text.slice(0, side)}${marker}${text.slice(-side)}`;
}

function sourceBlock(source, { isCurrent = false } = {}) {
  const zoomSummary = typeof source?.zoom_generated_summary === 'string' ? source.zoom_generated_summary.trim() : '';
  const transcript = typeof source?.original_transcript === 'string' ? source.original_transcript.trim() : '';
  const transcriptForPrompt = isCurrent ? transcript : (!zoomSummary ? boundedTranscriptExcerpt(transcript) : '');
  return `<session_source id="session:${source.sessionId}" occurred_at="${source.occurredAt || ''}" role="${isCurrent ? 'current' : 'continuity'}">
${zoomSummary ? `<zoom_generated_summary>\n${zoomSummary}\n</zoom_generated_summary>` : ''}
${transcriptForPrompt ? `<${isCurrent ? 'original_transcript' : 'original_transcript_excerpt'}>\n${transcriptForPrompt}\n</${isCurrent ? 'original_transcript' : 'original_transcript_excerpt'}>` : ''}
</session_source>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const {
      clientId,
      sessionId,
      transcriptId,
      lens = 'integrative',
      window = 'current',
      therapistGuidance = ''
    } = req.body || {};

    if (
      !clientId ||
      !sessionId ||
      !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) ||
      !SUMMARY_WINDOWS.has(window) ||
      typeof therapistGuidance !== 'string' ||
      therapistGuidance.length > 6000
    ) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Choose a valid client, session, summary approach and evidence scope.' }
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, client_id, user_id, occurred_at, clients(id, user_id, display_name)')
      .eq('id', sessionId)
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found or access denied.' }
      });
    }

    let sourceSessions = [{ id: session.id, occurred_at: session.occurred_at }];
    if (window === 'recent') {
      const { data: recentSessions, error: recentSessionsError } = await supabase
        .from('sessions')
        .select('id, occurred_at')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .lte('occurred_at', session.occurred_at)
        .order('occurred_at', { ascending: false })
        .limit(8);
      if (recentSessionsError) throw recentSessionsError;
      sourceSessions = recentSessions || sourceSessions;
    }

    const sourceSessionIds = sourceSessions.map(item => String(item.id));
    let transcriptQuery = supabase
      .from('zoom_transcripts')
      .select('id, original_transcript, zoom_generated_summary, source, session_ref, received_at')
      .eq('therapist_user_id', user.id)
      .eq('client_id', clientId)
      .in('session_ref', sourceSessionIds)
      .order('received_at', { ascending: false });

    const { data: transcriptRows, error: transcriptError } = await transcriptQuery;
    if (transcriptError) throw transcriptError;

    const transcriptsBySession = new Map();
    for (const row of transcriptRows || []) {
      const ref = String(row.session_ref || '');
      if (!ref || !sourceSessionIds.includes(ref) || !sourceHasMaterial(row)) continue;
      if (ref === String(sessionId) && transcriptId && String(row.id) !== String(transcriptId)) continue;
      if (!transcriptsBySession.has(ref)) transcriptsBySession.set(ref, row);
    }

    const sources = [];
    for (const sourceSession of sourceSessions) {
      const ref = String(sourceSession.id);
      const row = transcriptsBySession.get(ref);
      if (!row) continue;
      sources.push({
        id: `session:${ref}`,
        sessionId: ref,
        transcriptId: row.id,
        occurredAt: sourceSession.occurred_at,
        source: row.source,
        original_transcript: row.original_transcript,
        zoom_generated_summary: row.zoom_generated_summary
      });
      if (sources.length >= (window === 'recent' ? 3 : 1)) break;
    }

    if (!sources.length || String(sources[0].sessionId) !== String(sessionId)) {
      return res.status(409).json({
        success: false,
        error: { code: 'NO_SOURCE_MATERIAL', message: 'No session transcript or Zoom summary is available yet.' }
      });
    }

    const generationId = randomUUID();
    const generatedAt = new Date().toISOString();
    const guidance = therapistGuidance.trim();
    const lensRule = clientSessionSummaryLensRule(lens);
    const validSourceIds = new Set(sources.map(source => source.id));
    if (guidance) validSourceIds.add('therapist:guidance');

    const evidenceThresholds = window === 'recent'
      ? `- A recurring pattern requires substantially similar evidence in at least two supplied session sources.
- Change requires explicit comparative evidence; silence is not improvement.
- Recurrence is not causality.`
      : `- Treat this as a single-session summary.
- Do not claim longitudinal recurrence unless the current source explicitly describes established history.
- Use current_observation, explicit_change or tentative_connection rather than recurring.`;

    const systemPrompt = `You are Helios Clinical Intelligence preparing an editable client-facing therapy session summary for therapist review.

The supplied session sources are clinical data, newest first. The first source is the current encounter.
${sources.map((source, index) => sourceBlock(source, { isCurrent: index === 0 })).join('\n\n')}

${guidance ? `<therapist_guidance>\n${guidance}\n</therapist_guidance>\n\nTherapist guidance may direct emphasis or add therapist-authored context. Never present it as something the client said.` : ''}

Selected summary approach:
${lensRule}

Rules:
1. Write for the client in warm, collaborative, professional language.
2. Use only the supplied sources and optional therapist guidance.
3. Do not include private reflections, supervision material, diagnostic coding or institutional SOAP language.
4. Do not invent risk, diagnosis, motivation, treatment response, history, homework or causal explanations.
5. Preserve uncertainty. Use tentative language for inferred psychological meaning.
6. Each section must add distinct value and avoid repetition.\n6a. Earlier continuity sessions may contain a Zoom summary or a bounded transcript excerpt rather than the full transcript. Use them to support continuity and recurrence, but do not overstate detail that is not present in that compact source.
7. patternsOverTime is only for genuinely supported recurrence or explicitly established history.
8. betweenSession contains only agreed intentions, experiments, resources or questions supported by the evidence.
9. Apply the selected approach only where the evidence supports it; do not force model terminology into the prose.
10. Evidence rules:
${evidenceThresholds}
11. Allowed evidenceStrength values are current_observation, recurring, explicit_change, therapist_guidance and tentative_connection.
12. Every claim must cite only supplied IDs. Use session source IDs such as "session:<uuid>"; therapist guidance uses "therapist:guidance".

Return JSON only with exactly two fields:
- sections: an object with fields opening, whatWeWorkedOn, patternsOverTime, changesAndExceptions, strengthsAndResources, perspectiveReflection, betweenSession, closing. EVERY section value must be a JSON string. Use "" when a section has insufficient evidence. Never return an object, array, bullet-list structure or nested value for a section.
- claims: an array where each item is { section, text, sourceIds, evidenceStrength }. claim.text must always be a JSON string.
Every non-empty section must have at least one claim, and each claim text must appear verbatim in its section.`;

    const userInput = window === 'recent'
      ? `Prepare the current session summary using the current encounter plus up to two previous available session sources for continuity. ${sources.length} session source(s) are available.`
      : 'Prepare the current session summary from this encounter only.';

    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.CLIENT_SESSION_SUMMARY,
      userId: user.id,
      promptVersion: PROMPT_VERSION,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      responseFormat: clientSessionSummaryResponseFormat(validSourceIds),
      temperature: 0.3,
      maxTokens: 6000,
      timeout: 60000
    });

    const finishReason = completion.choices?.[0]?.finish_reason || null;
    const structured = validateClientSessionSummaryResponse(
      normalizeClientSessionSummaryResponse(completion.choices?.[0]?.message?.content),
      validSourceIds
    );
    if (!structured) {
      console.warn(`[Session Summary] Structured response rejected (finish_reason=${finishReason || 'unknown'}, output_tokens=${Number(completion.usage?.completion_tokens || 0)})`);
      return res.status(502).json({
        success: false,
        error: {
          code: finishReason === 'length' ? 'AI_RESPONSE_TRUNCATED' : 'INVALID_AI_RESPONSE',
          message: finishReason === 'length'
            ? 'The generated session summary was too long to complete. Please try again.'
            : 'Session summary generation is temporarily unavailable.'
        }
      });
    }

    const body = renderClientSessionSummary(structured.sections, lens);
    const sourceManifest = sources.map(source => ({
      id: source.id,
      sessionId: source.sessionId,
      transcriptId: source.transcriptId,
      kind: 'zoom_transcript',
      source: source.source,
      occurredAt: source.occurredAt,
      hasTranscript: Boolean(source.original_transcript),
      hasZoomSummary: Boolean(source.zoom_generated_summary)
    }));
    if (guidance) {
      sourceManifest.push({ id: 'therapist:guidance', kind: 'therapist_guidance' });
    }

    return res.status(200).json({
      success: true,
      data: {
        generationId,
        generatedAt,
        draft: { body, sections: structured.sections },
        claims: structured.claims,
        sources: sourceManifest,
        lens,
        window,
        sessionCount: sources.length,
        promptVersion: PROMPT_VERSION,
        model,
        usage: {
          inputTokens: Number(completion.usage?.prompt_tokens || 0),
          outputTokens: Number(completion.usage?.completion_tokens || 0),
          totalTokens: Number(completion.usage?.total_tokens || 0)
        }
      }
    });
  } catch (error) {
    console.error('[Session Summary] Error:', error.message);

    if (error.name === 'APITimeoutError' || error.status === 408 || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Session summary generation is temporarily unavailable.'
        }
      });
    }

    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: 'Session summary generation is temporarily unavailable.'
      }
    });
  }
}
