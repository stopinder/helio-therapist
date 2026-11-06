import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../_lib/summary-outcome.js';
import { assertSourceAvailable, assertSourcesUnchanged, flagSourceReview } from '../_lib/source-review.js';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import {
  CLIENT_SESSION_SUMMARY_LENSES,
  clientSessionSummaryLensRule,
  renderClientSessionSummary
} from '../_lib/ai-client-session-summary.js';

const SUMMARY_WINDOWS = new Set(['current', 'recent']);
const PROMPT_VERSION = 'session-summary-direct-v6-source-review';

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

export function sourceBlock(source, { isCurrent = false } = {}) {
  const zoomSummary = typeof source?.zoom_generated_summary === 'string' ? source.zoom_generated_summary.trim() : '';
  const transcript = typeof source?.original_transcript === 'string' ? source.original_transcript.trim() : '';
  const transcriptForPrompt = isCurrent ? transcript : (!zoomSummary ? boundedTranscriptExcerpt(transcript) : '');
  return { id:source.id, occurredAt:source.occurredAt, role:isCurrent?'current':'continuity',
    transcript:transcriptForPrompt, zoom_note:zoomSummary,
    therapistSourceClarification:source.source_review?.state==='confirmed'?source.source_review.context:'' };

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
      sourceSessions = [{id:session.id,occurred_at:session.occurred_at},...(recentSessions||[]).filter(item=>String(item.id)!==String(sessionId))];
    }

    const sourceSessionIds = sourceSessions.map(item => String(item.id));
    let transcriptQuery = supabase
      .from('zoom_transcripts')
      .select('id, original_transcript, zoom_generated_summary, source, session_ref, received_at, source_version, source_review, client_id')
      .eq('therapist_user_id', user.id)
      .eq('client_id', clientId)
      .is('deleted_at', null)
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
        zoom_generated_summary: row.zoom_generated_summary,
        source_version:row.source_version,source_review:row.source_review,row
      });
      if (sources.length >= (window === 'recent' ? 3 : 1)) break;
    }

    if (!sources.length || String(sources[0].sessionId) !== String(sessionId)) {
      return res.status(409).json({
        success: false,
        error: { code: 'NO_SOURCE_MATERIAL', message: 'No session transcript or Zoom summary is available yet.' }
      });
    }

    for(const source of sources)assertSourceAvailable(source.row);
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
- Do not claim cross-session longitudinal recurrence from one supplied session.
- If the current transcript itself explicitly describes an established repeated history, you may describe that reported history, but use evidenceStrength=current_observation, never recurring.
- Use current_observation, explicit_change or tentative_connection rather than recurring.`;

    const systemPrompt = `You are Helios Clinical Intelligence preparing an editable client-facing therapy session summary for therapist review.

The supplied session sources are clinical data in the user message, current encounter first. Assigned identity and therapist clarification are context, not proof that every passage belongs to the client. Therapist guidance is not client speech.

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
11. Allowed evidenceStrength values are current_observation, recurring, explicit_change, therapist_guidance and tentative_connection. Use recurring only when at least two supplied session IDs support the claim. A repeated pattern reported inside one session is still current_observation metadata.
12. Every claim must cite only supplied IDs. Use session source IDs such as "session:<uuid>"; therapist guidance uses "therapist:guidance".

For a ready outcome, supply these clinical fields:
- sections: an object with fields opening, whatWeWorkedOn, patternsOverTime, changesAndExceptions, strengthsAndResources, perspectiveReflection, betweenSession, closing. EVERY section value must be a JSON string. Use "" when a section has insufficient evidence. Never return an object, array, bullet-list structure or nested value for a section.
- claims: an array where each item is { section, text, sourceIds, evidenceStrength }. claim.text must always be a JSON string.
Every non-empty section must have at least one claim, and each claim text must appear verbatim in its section.
${SUMMARY_OUTCOME_RULES}`;

    const sourceBlocks=sources.map((source,index)=>sourceBlock(source,{isCurrent:index===0}));
    const userInput=JSON.stringify({task:window==='recent'?'Prepare this encounter with prior continuity.':'Prepare this encounter only.',
      assignedClient:{id:clientId,name:session.clients?.display_name||''},sessionId,sourceBlocks,therapistGuidance:guidance});

    const request = {
      feature: AI_FEATURES.CLIENT_SESSION_SUMMARY,
      userId: user.id,
      promptVersion: PROMPT_VERSION,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      responseFormat: summaryOutcomeResponseFormat(validSourceIds),
      temperature: 0.3,
      maxTokens: 6000,
      timeout: 60000
    };
    const { completion, model } = await runTextAI(request);
    let response=completion;
    let finishReason=response.choices?.[0]?.finish_reason||null;
    const evidenceSources=sources.map(source=>({id:source.id,transcriptId:source.transcriptId,
      transcript:source.original_transcript||'',zoom_note:source.zoom_generated_summary||''}));
    let structured=validateSummaryOutcome(response.choices?.[0]?.message?.content,validSourceIds,evidenceSources);
    if(!structured && finishReason==='stop'){
      // One bounded repair pass. The source/claim validator remains unchanged for ready drafts.
      console.warn('[Session Summary] Output failed source/structure validation; one repair attempt');
      try{
        const repaired=await runTextAI({
          ...request,
          messages:[...request.messages,
            {role:'assistant',content:String(response.choices?.[0]?.message?.content||'').slice(0,22000)},
            {role:'user',content:'The previous structured result did not pass strict source/format validation. Recheck the source and return a corrected result in the same schema. For a ready summary, every non-empty section must have verbatim claims with supplied source IDs. If the recording genuinely requires source review, return needs_review with precise verbatim passages from the supplied source. Do not invent evidence, omit uncertainty, or change a review outcome merely to pass validation.'}
          ]
        });
        response=repaired.completion;
        finishReason=response.choices?.[0]?.finish_reason||null;
        structured=validateSummaryOutcome(response.choices?.[0]?.message?.content,validSourceIds,evidenceSources);
      }catch(repairError){console.warn('[Session Summary] Repair attempt unavailable',repairError.code||repairError.name)}
    }
    if(!structured){
      // Never log patient source text or generated content.
      console.warn('[Session Summary] Structured response rejected after validation', {finishReason,outputTokens:Number(response.usage?.completion_tokens||0)});
      return res.status(502).json({success:false,error:{
        code:finishReason==='length'?'AI_RESPONSE_TRUNCATED':'AI_RESPONSE_UNVERIFIED',
        message:finishReason==='length'
          ? 'The generated session summary was too long to complete. Your previous draft is unchanged.'
          : 'The generated summary could not be verified against its sources. No draft was saved. Retry or review the original transcript.'
      }});
    }

    if(structured.outcome==='generation_failed')return res.status(502).json({success:false,error:{code:'INVALID_AI_RESPONSE',message:'No usable summary was produced. Your previous draft is unchanged.'}});
    await assertSourcesUnchanged(supabase,user.id,sources.map(source=>source.row));
    if(structured.outcome==='needs_review'){
      const reviews=[];
      if(!structured.review.requiresManualVerification){
        for(const source of sources.filter(item=>structured.review.evidence.some(e=>e.sourceId===item.id))){
          reviews.push(await flagSourceReview(supabase,user.id,source.row,{...structured.review,evidence:structured.review.evidence.filter(e=>e.sourceId===source.id)}));
        }
      }else{
        // Unverified quotations cannot change a patient's source-review state.
        for(const source of sources)reviews.push({transcriptId:source.transcriptId,sessionId:source.sessionId,sourceVersion:source.source_version,state:'unreviewed'});
      }
      return res.status(200).json({success:true,data:{outcome:'needs_review',review:{...structured.review,sources:reviews}}});
    }
    const body = renderClientSessionSummary(structured.sections, lens);
    const sourceManifest = sources.map(source => ({
      id: source.id,
      sessionId: source.sessionId,
      transcriptId: source.transcriptId,
      kind: 'zoom_transcript',
      sourceVersion:source.source_version,
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
        outcome:'ready',
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
    if(error.code==='SOURCE_REVIEW_REQUIRED')return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:error.message,sources:error.review?[error.review]:[]}}});
    if(error.code==='SOURCE_CHANGED')return res.status(409).json({success:false,error:{code:error.code,message:'The source changed during generation. Reload before retrying. Your previous draft is unchanged.'}});
    console.error('[Session Summary] Error:', error.code||error.name);

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
