import { normalizeSummaryOptions, resourceAppendix, wantsSummaryExercise } from '../../src/lib/summaryAuthoring.js';
import { SUMMARY_POLICY_VERSION } from '../_lib/summary-authoring-policy.js';
import { reviewSummaryDraft } from '../_lib/summary-quality-review.js';
import { verifySummaryResource } from '../_lib/summary-resource-check.js';
import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../_lib/summary-outcome.js';
import { assertDocumentSourcesUsable, assertSourceAvailable, assertSourcesUnchanged, flagSourceReview, presentReview } from '../_lib/source-review.js';
import { isUnusableSummary } from '../../src/lib/summarySafety.js';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import { buildSampleClientSummary } from '../_lib/sample-practice.js';
import { CLIENT_SESSION_SUMMARY_LENSES, CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, buildClinicalIntelligenceEvidenceMap, buildClinicalIntelligenceSessionCandidates, clientSessionSummarySystemPrompt, renderClientSessionSummary, selectClinicalIntelligenceSources } from '../_lib/ai-client-session-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } }); }
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, lens='general', window='last_three', therapistGuidance='', refinementRequest='', previousDraft='', anchorSessionId=null, preview=false } = req.body || {};
    if (!clientId || typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId) || (anchorSessionId!==null&&(typeof anchorSessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(anchorSessionId))) || typeof preview!=='boolean' || !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) || !['current','last_three','last_five','history'].includes(window) || typeof therapistGuidance !== 'string' || therapistGuidance.length > 6000 || typeof refinementRequest !== 'string' || refinementRequest.length > 1800 || typeof previousDraft !== 'string' || previousDraft.length > 10000 || (refinementRequest.trim() && !previousDraft.trim())) {
      return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Choose a valid client, lens and summary window.' } });
    }
    const summaryOptions=normalizeSummaryOptions(req.body?.summaryOptions ?? {});
    const { data: ownedClient, error: clientError } = await supabase.from('clients').select('id,reference').eq('id', clientId).eq('user_id', user.id).maybeSingle();
    if (clientError) throw clientError;
    if (!ownedClient) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found or access denied.' } });

    const captureLimit = window === 'current' ? 1 : window === 'last_three' ? 3 : window === 'last_five' ? 5 : null;
    const captures = [];
    const pageSize = 200;
    for (let from = 0; ; from += pageSize) {
      const { data: page, error: captureError } = await supabase
        .from('session_capture_drafts')
        .select('session_id,content,reviewed_at,sessions!inner(id,occurred_at,user_id,client_id)')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('status', 'reviewed')
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending:false })
        .range(from, from + pageSize - 1);
      if (captureError) throw captureError;
      captures.push(...(page || []));
      if (!page || page.length < pageSize) break;
    }
    const summaryDocuments = [];
    for (let from = 0; ; from += pageSize) {
      const { data: page, error: documentError } = await supabase
        .from('documents')
        .select('id,status,content,source_manifest,created_at,updated_at')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('document_type', 'session_summary')
        .is('archived_at', null)
        .order('updated_at', { ascending:false })
        .range(from, from + pageSize - 1);
      if (documentError) throw documentError;
      summaryDocuments.push(...(page || []));
      if (!page || page.length < pageSize) break;
    }

    const sessions = [];
    for (let from = 0; ; from += pageSize) {
      const { data: page, error: sessionError } = await supabase
        .from('sessions')
        .select('id,occurred_at')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('occurred_at', { ascending:false })
        .range(from, from + pageSize - 1);
      if (sessionError) throw sessionError;
      sessions.push(...(page || []));
      if (!page || page.length < pageSize) break;
    }

    const transcriptRows = [];
    for (let from = 0; ; from += pageSize) {
      const { data: page, error: transcriptError } = await supabase
        .from('zoom_transcripts')
        .select('id,session_ref,source_version,source_review,client_id')
        .eq('client_id', clientId)
        .eq('therapist_user_id', user.id)
        .is('deleted_at', null)
        .range(from, from + pageSize - 1);
      if (transcriptError) throw transcriptError;
      transcriptRows.push(...(page || []));
      if (!page || page.length < pageSize) break;
    }

    const requestedAnchor=anchorSessionId||sessions[0]?.id;
    const blockedAnchor=transcriptRows.find(row=>String(row.session_ref)===String(requestedAnchor)&&['needs_review','separated'].includes(row.source_review?.state));
    if(blockedAnchor&&!preview)return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:'This encounter needs source review.',sources:[presentReview(blockedAnchor)]}}});
    const candidates = buildClinicalIntelligenceSessionCandidates({ captures, summaryDocuments, sessions, transcriptRows });
    const notice=summaryDocuments.find(doc=>isUnusableSummary(doc.content)&&doc.source_manifest?.some(source=>source.sessionId===requestedAnchor));
    if(notice&&!candidates.some(item=>item.session_id===requestedAnchor)&&!preview)return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:'The saved item is a source-review notice, not clinical evidence. Review the original and regenerate its session summary.',sources:transcriptRows.filter(row=>String(row.session_ref)===String(requestedAnchor)).map(presentReview)}}});
    const selectedRows=selectClinicalIntelligenceSources(candidates,{anchorSessionId,limit:captureLimit});
    if(anchorSessionId&&!selectedRows.some(row=>String(row.session_id)===String(anchorSessionId)))return res.status(409).json({success:false,error:{code:'ANCHOR_SESSION_NOT_AVAILABLE',message:'Choose an available session source for this client.'}});
    const selectedCaptures = selectedRows.map(row => ({
      sessionId:row.session_id,
      occurredAt:row.sessions?.occurred_at,
      reviewedAt:row.reviewed_at,
      evidence_source:row.evidence_source,
      document_id:row.document_id || null,
      document_status:row.document_status || null,
      content:row.content || {}
    }));
    if (!selectedCaptures.length) return res.status(409).json({ success:false, error:{ code:'NO_CLIENT_SUMMARY_EVIDENCE', message:'No reviewed Session Capture or existing transcript-backed session summary is available yet.' } });
    if(preview){const availableSessions=selectClinicalIntelligenceSources(candidates,{limit:null}).map(row=>({sessionId:row.session_id,occurredAt:row.sessions?.occurred_at,reviewedAt:row.reviewed_at,sourceType:row.evidence_source||'session_capture'}));return res.status(200).json({success:true,data:{availableSessions}});}

    const selectedTranscriptRows=transcriptRows.filter(row=>selectedCaptures.some(capture=>String(capture.sessionId)===String(row.session_ref)));
    for(const row of selectedTranscriptRows)assertSourceAvailable(row);
    for(const capture of selectedCaptures.filter(item=>item.document_id)){
      const doc=summaryDocuments.find(item=>item.id===capture.document_id);
      await assertDocumentSourcesUsable(supabase,user.id,{...doc,client_id:clientId,document_type:'session_summary'});
    }
    const { data: careItems, error: careError } = await supabase.from('client_care_items').select('id,kind,body,status,origin,provenance_session_id').eq('client_id', clientId).eq('therapist_id', user.id).eq('status', 'current').order('updated_at', { ascending:false }).limit(30);
    if (careError) throw careError;

    // An accepted editorial instruction is therapist-authored context, never a record of something said or completed.
    const resourceVerification=await verifySummaryResource(summaryOptions.resource);
    const exerciseGuidance=wantsSummaryExercise(summaryOptions)?'Therapist requests an optional future exercise for consideration, not performed or agreed in session.':'';
    const approvedGuidance = refinementRequest.trim()
      ? [exerciseGuidance,therapistGuidance, 'Therapist-approved editorial request (not a session event or an agreed intervention): ' + refinementRequest.trim()].filter(Boolean).join('\n\n')
      : [exerciseGuidance,therapistGuidance].filter(Boolean).join("\n\n");
    const evidenceMap=buildClinicalIntelligenceEvidenceMap({captures:selectedCaptures,careItems:careItems||[],therapistGuidance:approvedGuidance});
    const validSourceIds=new Set([...evidenceMap.reviewedSessions.map(item=>item.id),...evidenceMap.currentAcceptedCareContext.map(item=>item.id),...(evidenceMap.therapistAuthoredContext.content?[evidenceMap.therapistAuthoredContext.id]:[])]);
    const generationId=randomUUID(),generatedAt=new Date().toISOString();
    const { data: verifiedSampleClient, error: sampleClientError } = await supabase.rpc('is_sample_client', {
      p_user_id: user.id,
      p_client_id: clientId
    });
    if (sampleClientError) throw sampleClientError;
    const sampleSummary = buildSampleClientSummary({
      reference: ownedClient.reference,
      lens,
      selectedCaptures,
      sampleVerified: verifiedSampleClient === true
    });
    if (sampleSummary) {
      if (refinementRequest.trim()) {
        return res.status(409).json({success:false,error:{code:'SAMPLE_REFINEMENT_UNAVAILABLE',message:'Sample Practice summaries are fixed demonstrations. Refine a draft from your own reviewed clinical evidence instead.'}});
      }
      const body = renderClientSessionSummary(sampleSummary.sections, lens);
      const sources=[
        ...evidenceMap.reviewedSessions.map(item=>({id:item.id,kind:item.sourceType==='transcript_backed_session_summary'?'session_summary':'session_capture',sessionId:item.sessionId,occurredAt:item.occurredAt,reviewedAt:item.reviewedAt,documentId:item.sourceDocumentId||undefined,status:item.sourceStatus||undefined})),
        ...evidenceMap.currentAcceptedCareContext.map(item=>({id:item.id,kind:'accepted_care',careKind:item.kind})),
        ...(evidenceMap.therapistAuthoredContext.content?[{id:'therapist:guidance',kind:'therapist_guidance'}]:[])
      ];
      return res.status(200).json({
        success:true,
        data:{
          outcome:'ready',
          generationId,
          generatedAt,
          draft:{body,sections:sampleSummary.sections},
          claims:sampleSummary.claims,
          sources,
          lens,
          window,
          sessionCount:selectedCaptures.length,
          promptVersion:'sample-practice-client-summary-v1',
          model:'deterministic-sample',
          usage:{inputTokens:0,outputTokens:0,totalTokens:0},
          sample:true,
          aiAllowanceUsed:false
        }
      });
    }
    const request = {
      feature:AI_FEATURES.CLIENT_SESSION_SUMMARY, userId:user.id, promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,
      messages:[{role:'system',content:clientSessionSummarySystemPrompt(lens,summaryOptions).replace('Return JSON only with exactly two fields:','For a ready result, supply these clinical fields:')+'\n'+SUMMARY_OUTCOME_RULES},{role:'user',content:buildClientSessionSummaryInput({lens,window,captures:selectedCaptures,careItems:careItems||[],therapistGuidance:approvedGuidance,refinementRequest,previousDraft,summaryOptions})}],
      responseFormat:summaryOutcomeResponseFormat(validSourceIds), temperature:0.2, maxTokens:8000, timeout:60000
    };
    let { completion, model } = await runTextAI(request);
    const finishReason = completion.choices?.[0]?.finish_reason || null;
    const evidenceSources=evidenceMap.reviewedSessions.map(item=>({id:item.id,
      [item.sourceType==='transcript_backed_session_summary'?'session_summary':'session_capture']:item.content.existingSessionSummary||JSON.stringify(item.content)}));
    let structured=validateSummaryOutcome(completion.choices?.[0]?.message?.content,validSourceIds,evidenceSources);
    if (!structured) {
      const truncated = finishReason === 'length';
      console.warn(`[Client Session Summary] Structured response rejected (finish_reason=${finishReason || 'unknown'}, output_tokens=${Number(completion.usage?.completion_tokens || 0)})`);
      return res.status(502).json({
        success:false,
        error:{
          code:truncated?'AI_RESPONSE_TRUNCATED':'INVALID_AI_RESPONSE',
          message:truncated?'The generated summary was too long to complete. Please try again.':'Client summary generation is temporarily unavailable.'
        }
      });
    }
    const reviewed=await reviewSummaryDraft({request,completion,model,structured,validSourceIds,evidenceSources,summaryOptions});
    structured=reviewed.structured;completion=reviewed.completion;model=reviewed.model;
    const qualityReview=reviewed.qualityReview;
    await assertSourcesUnchanged(supabase,user.id,selectedTranscriptRows);
    for(const capture of selectedCaptures.filter(item=>item.document_id)){
      const original=summaryDocuments.find(doc=>doc.id===capture.document_id);
      const {data:current,error:readError}=await supabase.from('documents').select('id,updated_at').eq('id',capture.document_id).eq('user_id',user.id).eq('client_id',clientId).maybeSingle();
      if(readError)throw readError;
      if(!current||current.updated_at!==original.updated_at)throw Object.assign(new Error('Evidence changed.'),{status:409,code:'SOURCE_CHANGED'});
    }
    if(structured.outcome==='needs_review'){
      const reviews=[];
      for(const row of selectedTranscriptRows.filter(item=>structured.review.evidence.some(e=>e.sourceId===`session:${item.session_ref}`))){
        reviews.push(await flagSourceReview(supabase,user.id,row,{...structured.review,evidence:structured.review.evidence.filter(e=>e.sourceId===`session:${row.session_ref}`)}));
      }
      return res.status(200).json({success:true,data:{outcome:'needs_review',review:{...structured.review,sources:reviews}}});
    }
    if(structured.outcome==='generation_failed')return res.status(502).json({success:false,error:{code:'INVALID_AI_RESPONSE',message:'No usable summary was produced. Your previous draft is unchanged.'}});
    const body = renderClientSessionSummary(structured.sections, lens) + resourceAppendix(summaryOptions.resource,resourceVerification);
    const sources=[...selectedTranscriptRows.map(row=>({id:`transcript:${row.id}`,kind:'zoom_transcript',transcriptId:row.id,sessionId:String(row.session_ref),sourceVersion:row.source_version})),...evidenceMap.reviewedSessions.map(item=>({id:item.id,kind:item.sourceType==='transcript_backed_session_summary'?'session_summary':'session_capture',sessionId:item.sessionId,occurredAt:item.occurredAt,reviewedAt:item.reviewedAt,documentId:item.sourceDocumentId||undefined,status:item.sourceStatus||undefined})),...evidenceMap.currentAcceptedCareContext.map(item=>({id:item.id,kind:'accepted_care',careKind:item.kind})),...(evidenceMap.therapistAuthoredContext.content?[{id:'therapist:guidance',kind:'therapist_guidance'}]:[])];
    return res.status(200).json({ success:true, data:{ outcome:'ready',generationId,generatedAt,draft:{body,sections:structured.sections},claims:structured.claims,sources,lens,window,sessionCount:selectedCaptures.length,promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,summaryOptions,resourceSelection:summaryOptions.resource?{...summaryOptions.resource,verification:resourceVerification}:null,qualityReview,model,usage:{inputTokens:Number(completion.usage?.prompt_tokens||0),outputTokens:Number(completion.usage?.completion_tokens||0),totalTokens:Number(completion.usage?.total_tokens||0)} } });
  } catch (error) {
    if(['INVALID_SUMMARY_OPTIONS','RESOURCE_NOT_VERIFIED','SUMMARY_ADDITION_NOT_VERIFIED'].includes(error.code))return res.status(error.status||422).json({success:false,error:{code:error.code,message:error.message}});
    if(error.code==='SOURCE_REVIEW_REQUIRED')return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:error.message,sources:error.review?[error.review]:[]}}});
    if(error.code==='SOURCE_CHANGED')return res.status(409).json({success:false,error:{code:error.code,message:'Source evidence changed. Reload before retrying. Your previous draft is unchanged.'}});
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) return res.status(504).json({ success:false, error:{ code:'GATEWAY_TIMEOUT', message:'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'Client summary generation is temporarily unavailable.' } });
    console.error('[Client Session Summary] Error:', error.message);
    const status=error.status||500; return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':(error.code||'INTERNAL_SERVER_ERROR'), message:status===401?'Please sign in again.':'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
  }
}
