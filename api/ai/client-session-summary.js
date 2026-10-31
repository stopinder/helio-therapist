import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import { CLIENT_SESSION_SUMMARY_LENSES, CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, buildClinicalIntelligenceEvidenceMap, buildClinicalIntelligenceSessionCandidates, clientSessionSummaryResponseFormat, clientSessionSummarySystemPrompt, normalizeClientSessionSummaryResponse, renderClientSessionSummary, selectClinicalIntelligenceSources, validateClientSessionSummaryResponse } from '../_lib/ai-client-session-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } }); }
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, lens='general', window='last_three', therapistGuidance='', anchorSessionId=null, preview=false } = req.body || {};
    if (!clientId || typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId) || (anchorSessionId!==null&&(typeof anchorSessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(anchorSessionId))) || typeof preview!=='boolean' || !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) || !['current','last_three','last_five','history'].includes(window) || typeof therapistGuidance !== 'string' || therapistGuidance.length > 6000) {
      return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Choose a valid client, lens and summary window.' } });
    }
    const { data: ownedClient, error: clientError } = await supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle();
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
        .select('id,session_ref')
        .eq('client_id', clientId)
        .eq('therapist_user_id', user.id)
        .is('deleted_at', null)
        .range(from, from + pageSize - 1);
      if (transcriptError) throw transcriptError;
      transcriptRows.push(...(page || []));
      if (!page || page.length < pageSize) break;
    }

    const candidates = buildClinicalIntelligenceSessionCandidates({ captures, summaryDocuments, sessions, transcriptRows });
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

    const { data: careItems, error: careError } = await supabase.from('client_care_items').select('id,kind,body,status,origin,provenance_session_id').eq('client_id', clientId).eq('therapist_id', user.id).eq('status', 'current').order('updated_at', { ascending:false }).limit(30);
    if (careError) throw careError;

    const evidenceMap=buildClinicalIntelligenceEvidenceMap({captures:selectedCaptures,careItems:careItems||[],therapistGuidance});
    const validSourceIds=new Set([...evidenceMap.reviewedSessions.map(item=>item.id),...evidenceMap.currentAcceptedCareContext.map(item=>item.id),...(evidenceMap.therapistAuthoredContext.content?[evidenceMap.therapistAuthoredContext.id]:[])]);
    const generationId=randomUUID(),generatedAt=new Date().toISOString();
    const { completion, model } = await runTextAI({
      feature:AI_FEATURES.CLIENT_SESSION_SUMMARY, userId:user.id, promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,
      messages:[{role:'system',content:clientSessionSummarySystemPrompt(lens)},{role:'user',content:buildClientSessionSummaryInput({lens,window,captures:selectedCaptures,careItems:careItems||[],therapistGuidance})}],
      responseFormat:clientSessionSummaryResponseFormat(validSourceIds), temperature:0.2, maxTokens:8000, timeout:60000
    });
    const finishReason = completion.choices?.[0]?.finish_reason || null;
    const structured = validateClientSessionSummaryResponse(normalizeClientSessionSummaryResponse(completion.choices?.[0]?.message?.content),validSourceIds);
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
    const body = renderClientSessionSummary(structured.sections, lens);
    if (body.length < 120) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Client summary generation is temporarily unavailable.' } });
    const sources=[...evidenceMap.reviewedSessions.map(item=>({id:item.id,kind:item.sourceType==='transcript_backed_session_summary'?'session_summary':'session_capture',sessionId:item.sessionId,occurredAt:item.occurredAt,reviewedAt:item.reviewedAt,documentId:item.sourceDocumentId||undefined,status:item.sourceStatus||undefined})),...evidenceMap.currentAcceptedCareContext.map(item=>({id:item.id,kind:'accepted_care',careKind:item.kind})),...(evidenceMap.therapistAuthoredContext.content?[{id:'therapist:guidance',kind:'therapist_guidance'}]:[])];
    return res.status(200).json({ success:true, data:{ generationId,generatedAt,draft:{body,sections:structured.sections},claims:structured.claims,sources,lens,window,sessionCount:selectedCaptures.length,promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,model,usage:{inputTokens:Number(completion.usage?.prompt_tokens||0),outputTokens:Number(completion.usage?.completion_tokens||0),totalTokens:Number(completion.usage?.total_tokens||0)} } });
  } catch (error) {
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) return res.status(504).json({ success:false, error:{ code:'GATEWAY_TIMEOUT', message:'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'Client summary generation is temporarily unavailable.' } });
    console.error('[Client Session Summary] Error:', error.message);
    const status=error.status||500; return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':(error.code||'INTERNAL_SERVER_ERROR'), message:status===401?'Please sign in again.':'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
  }
}
