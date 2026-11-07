import { normalizeSummaryOptions, resourceAppendix, wantsSummaryExercise } from '../../src/lib/summaryAuthoring.js';
import { SUMMARY_POLICY_VERSION } from '../_lib/summary-authoring-policy.js';
import { reviewSummaryDraft } from '../_lib/summary-quality-review.js';
import { verifySummaryResource } from '../_lib/summary-resource-check.js';
import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../_lib/summary-outcome.js';
import { verifiedPrimaryConflict, hardBoundary, cautiousSources } from '../_lib/summary-draft-policy.js';
import { assertSourceAvailable, assertSourcesUnchanged, flagSourceReview } from '../_lib/source-review.js';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import {
  CLIENT_SESSION_SUMMARY_LENSES,
  clientSessionSummarySystemPrompt,
  renderClientSessionSummary
} from '../_lib/ai-client-session-summary.js';

const SUMMARY_WINDOWS = new Set(['current', 'recent']);
const PROMPT_VERSION = SUMMARY_POLICY_VERSION + '/encounter';

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

export function sourceBlock(source, { isCurrent = false, suppressZoomNote = false } = {}) {
  const zoomSummary = suppressZoomNote ? '' : (typeof source?.zoom_generated_summary === 'string' ? source.zoom_generated_summary.trim() : '');
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
      excludeEarlierZoomNotes = false,
      therapistGuidance = '',
      refinementRequest = '',
      previousDraft = ''
    } = req.body || {};

    if (
      !clientId ||
      !sessionId ||
      !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) ||
      !SUMMARY_WINDOWS.has(window) ||
      typeof excludeEarlierZoomNotes !== 'boolean' ||
      typeof therapistGuidance !== 'string' ||
      therapistGuidance.length > 6000 ||
      typeof refinementRequest !== 'string' ||
      refinementRequest.length > 1800 ||
      typeof previousDraft !== 'string' ||
      previousDraft.length > 10000 ||
      (refinementRequest.trim().length > 0 && !previousDraft.trim())
    ) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Choose a valid client, session, summary approach and evidence scope.' }
      });
    }

    const summaryOptions = normalizeSummaryOptions(req.body?.summaryOptions ?? {});
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

    // Flagged earlier sessions must not block a separate current-session draft.
    // Exclusion means none of their content enters the model or source manifest.
    const omittedEarlierSources=[];
    const selectedSources=sources.filter((source,index)=>{
      if(index===0)return true;
      if(['needs_review','separated'].includes(source.source_review?.state) ||
         (excludeEarlierZoomNotes && !source.original_transcript?.trim())){
        omittedEarlierSources.push(source.id);
        return false;
      }
      return true;
    });
    for(const source of selectedSources)assertSourceAvailable(source.row);
    const generationId = randomUUID();
    const generatedAt = new Date().toISOString();
    const resourceVerification = await verifySummaryResource(summaryOptions.resource);
    const guidance = [wantsSummaryExercise(summaryOptions) ? 'Therapist requests an optional future exercise for consideration, not an intervention performed or agreed in session.' : '', therapistGuidance.trim(), refinementRequest.trim() ? 'Therapist-authorised editorial request (NOT evidence of an intervention conducted or agreed): ' + refinementRequest.trim() : ''].filter(Boolean).join('\n\n');
    const validSourceIds = new Set(selectedSources.map(source => source.id));
    if (guidance) validSourceIds.add('therapist:guidance');
    const systemPrompt = clientSessionSummarySystemPrompt(lens,summaryOptions)
      .replace('Return JSON only with exactly two fields:','For a ready outcome, supply these clinical fields:')
      + '\nEvidence window: ' + window + '\n' + SUMMARY_OUTCOME_RULES;

    const sourceBlocks=selectedSources.map((source,index)=>sourceBlock(source,{isCurrent:index===0,suppressZoomNote:excludeEarlierZoomNotes&&index>0}));
    const userInput=JSON.stringify({task:window==='recent'?'Prepare this encounter with prior continuity.':'Prepare this encounter only.',
      assignedClient:{id:clientId,name:session.clients?.display_name||''},sessionId,sourceBlocks,therapistGuidance:guidance,editorialPreferences:{audience:summaryOptions.audience,addition:summaryOptions.addition},
      editorialRefinement:refinementRequest.trim() ? {approvedInstruction:refinementRequest.trim(),previousDraftForComparisonOnly:previousDraft.slice(0,10000),boundary:'Neither the previous draft nor an exercise instruction is evidence of events, completed interventions or agreed homework.'} : null});

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
    let { completion, model } = await runTextAI(request);
    let response=completion;
    let finishReason=response.choices?.[0]?.finish_reason||null;
    const evidenceSources=selectedSources.map((source,index)=>({id:source.id,transcriptId:source.transcriptId,
      transcript:source.original_transcript||'',zoom_note:excludeEarlierZoomNotes&&index>0?'':(source.zoom_generated_summary||'')}));
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
    let usedSources=selectedSources;
    const reviewCautions=[];
    if(structured.outcome==='needs_review' && !hardBoundary(structured.review)){
      const remaining=cautiousSources(selectedSources,structured.review);
      if(remaining.length){
        // A secondary note is not authoritative. Try once more using only
        // remaining original transcripts and undisputed current material.
        const ids=new Set(remaining.map(item=>item.id));
        if(guidance)ids.add('therapist:guidance');
        try{
          const attempt=await runTextAI({...request,responseFormat:summaryOutcomeResponseFormat(ids),messages:[
            {role:'system',content:systemPrompt+'\nConflicting secondary Zoom notes were excluded. Write only from the remaining source evidence. If the ORIGINAL transcript genuinely shows mixed client encounters, return needs_review with precise transcript quotes.'},
            {role:'user',content:JSON.stringify({task:'Prepare a cautious editable draft from this client’s remaining evidence only.',assignedClient:{id:clientId,name:session.clients?.display_name||''},sessionId,sourceBlocks:remaining.map((source,index)=>sourceBlock(source,{isCurrent:index===0,suppressZoomNote:!!source.original_transcript?.trim()})),therapistGuidance:guidance})}
          ]});
          const evidence=remaining.map(source=>({id:source.id,transcriptId:source.transcriptId,transcript:source.original_transcript||'',zoom_note:source.original_transcript?.trim()?'':(source.zoom_generated_summary||'')}));
          const checked=validateSummaryOutcome(attempt.completion.choices?.[0]?.message?.content,ids,evidence);
          if(checked?.outcome==='ready'){
            structured=checked;usedSources=remaining;completion=attempt.completion;model=attempt.model;
            reviewCautions.push('A conflicting Zoom-generated note was excluded. Confirm the client identity and review this editable draft before approval.');
          }else if(checked?.outcome==='needs_review'&&hardBoundary(checked.review)){
            structured=checked;usedSources=remaining;
          }
        }catch(error){console.warn('[Session Summary] Cautious drafting unavailable',error.code||error.name)}
      }
    }
    let qualityReview={policyVersion:SUMMARY_POLICY_VERSION,kind:'mechanical_editorial_checks',revisionAttempted:false,warnings:[]};
    if(structured.outcome==='ready') {
      const qualityIds=new Set(usedSources.map(source=>source.id));
      if(guidance)qualityIds.add('therapist:guidance');
      const qualityInput=JSON.parse(userInput);
      qualityInput.sourceBlocks=usedSources.map((source,index)=>sourceBlock(source,{isCurrent:index===0,suppressZoomNote:(reviewCautions.length>0&&!!source.original_transcript?.trim())||(excludeEarlierZoomNotes&&index>0)}));
      const qualityEvidence=qualityInput.sourceBlocks.map(source=>({id:source.id,transcript:source.transcript,zoom_note:source.zoom_note}));
      const reviewed=await reviewSummaryDraft({request:{...request,responseFormat:summaryOutcomeResponseFormat(qualityIds),messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify(qualityInput)}]},completion,model,structured,validSourceIds:qualityIds,evidenceSources:qualityEvidence,summaryOptions});
      structured=reviewed.structured;completion=reviewed.completion;model=reviewed.model;qualityReview=reviewed.qualityReview;
    }
    await assertSourcesUnchanged(supabase,user.id,usedSources.map(source=>source.row));
    if(structured.outcome==='needs_review'){
      const reviews=[];
      if(verifiedPrimaryConflict(structured.review)){
        for(const source of usedSources.filter(item=>structured.review.evidence.some(e=>e.sourceId===item.id&&e.verified&&['transcript','session_capture'].includes(e.sourceType)))){
          reviews.push(await flagSourceReview(supabase,user.id,source.row,{...structured.review,evidence:structured.review.evidence.filter(e=>e.sourceId===source.id&&e.verified&&['transcript','session_capture'].includes(e.sourceType))}));
        }
      }else{
        // Unverified model quotations and secondary-only notes cannot lock sources.
        for(const source of usedSources)reviews.push({transcriptId:source.transcriptId,sessionId:source.sessionId,sourceVersion:source.source_version,state:'unreviewed'});
      }
      return res.status(200).json({success:true,data:{outcome:'needs_review',review:{...structured.review,sources:reviews,
        message:verifiedPrimaryConflict(structured.review)?structured.review.message:'A safe draft could not be prepared from the current evidence. Check the client and Zoom note, or try this session only. Your previous draft is unchanged.'}}});
    }
    const body = renderClientSessionSummary(structured.sections, lens) + resourceAppendix(summaryOptions.resource,resourceVerification);
    const sourceManifest = usedSources.map(source => ({
      id: source.id,
      sessionId: source.sessionId,
      transcriptId: source.transcriptId,
      kind: 'zoom_transcript',
      sourceVersion:source.source_version,
      source: source.source,
      occurredAt: source.occurredAt,
      hasTranscript: Boolean(source.original_transcript),
      hasZoomSummary: Boolean(source.zoom_generated_summary) && !(reviewCautions.length>0 && !!source.original_transcript?.trim()) && !(excludeEarlierZoomNotes && source.sessionId!==String(sessionId)),
      ...(reviewCautions.length && source.original_transcript?.trim()?{excludedZoomNote:true}:{})
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
        reviewCautions:[...reviewCautions,...(omittedEarlierSources.length?['Earlier flagged or note-only continuity sources were excluded.']:[]),...(excludeEarlierZoomNotes&&window==='recent'?['Earlier Zoom notes excluded by therapist choice.']:[])],
        sessionCount: usedSources.length,
        promptVersion: PROMPT_VERSION,
        summaryOptions, resourceSelection:summaryOptions.resource?{...summaryOptions.resource,verification:resourceVerification}:null, qualityReview,
        model,
        usage: {
          inputTokens: Number(completion.usage?.prompt_tokens || 0),
          outputTokens: Number(completion.usage?.completion_tokens || 0),
          totalTokens: Number(completion.usage?.total_tokens || 0)
        }
      }
    });
  } catch (error) {
    if(['INVALID_SUMMARY_OPTIONS','RESOURCE_NOT_VERIFIED','SUMMARY_ADDITION_NOT_VERIFIED'].includes(error.code))return res.status(error.status||422).json({success:false,error:{code:error.code,message:error.message}});
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
