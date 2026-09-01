import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import { CLIENT_SESSION_SUMMARY_LENSES, CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, buildClinicalIntelligenceEvidenceMap, clientSessionSummarySystemPrompt, renderClientSessionSummary, selectClinicalIntelligenceSources, validateClientSessionSummaryResponse } from '../_lib/ai-client-session-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } }); }
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, lens='general', window='last_three', therapistGuidance='', anchorSessionId=null, preview=false } = req.body || {};
    if (!clientId || typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId) || (anchorSessionId!==null&&(typeof anchorSessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(anchorSessionId))) || typeof preview!=='boolean' || !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) || !['current','last_three'].includes(window) || typeof therapistGuidance !== 'string' || therapistGuidance.length > 6000) {
      return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Choose a valid client, lens and summary window.' } });
    }
    const { data: ownedClient, error: clientError } = await supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle();
    if (clientError) throw clientError;
    if (!ownedClient) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found or access denied.' } });

    const captureLimit = window === 'current' ? 1 : 3;
    const { data: captures, error: captureError } = await supabase.from('session_capture_drafts').select('id,session_id,content,reviewed_at,sessions!inner(id,occurred_at,user_id,client_id)').eq('client_id', clientId).eq('user_id', user.id).eq('status', 'reviewed').not('reviewed_at', 'is', null).order('reviewed_at', { ascending:false }).limit(100);
    if (captureError) throw captureError;
    const selectedRows=selectClinicalIntelligenceSources(captures||[],{anchorSessionId,limit:captureLimit});
    if(anchorSessionId&&!selectedRows.some(row=>row.session_id===anchorSessionId))return res.status(409).json({success:false,error:{code:'ANCHOR_SESSION_NOT_REVIEWED',message:'Choose a reviewed Session Capture for this client.'}});
    const selectedCaptures = selectedRows.map(row => ({ id:row.id, sessionId:row.session_id, occurredAt:row.sessions?.occurred_at, reviewedAt:row.reviewed_at, content:row.content || {} }));
    if (!selectedCaptures.length) return res.status(409).json({ success:false, error:{ code:'NO_REVIEWED_SESSION_CAPTURE', message:'Review a Session Capture before generating a client summary.' } });
    if(preview){const availableSessions=selectClinicalIntelligenceSources(captures||[],{limit:100}).map(row=>({sessionId:row.session_id,occurredAt:row.sessions?.occurred_at,reviewedAt:row.reviewed_at}));return res.status(200).json({success:true,data:{availableSessions}});}

    const { data: careItems, error: careError } = await supabase.from('client_care_items').select('id,kind,body,status,origin,provenance_session_id').eq('client_id', clientId).eq('therapist_id', user.id).eq('status', 'current').order('updated_at', { ascending:false }).limit(30);
    if (careError) throw careError;

    const evidenceMap=buildClinicalIntelligenceEvidenceMap({captures:selectedCaptures,careItems:careItems||[],therapistGuidance});
    const validSourceIds=new Set([...evidenceMap.reviewedSessions.map(item=>item.id),...evidenceMap.currentAcceptedCareContext.map(item=>item.id),...(evidenceMap.therapistAuthoredContext.content?[evidenceMap.therapistAuthoredContext.id]:[])]);
    const generationId=randomUUID(),generatedAt=new Date().toISOString();
    const { completion, model } = await runTextAI({
      feature:AI_FEATURES.CLIENT_SESSION_SUMMARY, userId:user.id, promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,
      messages:[{role:'system',content:clientSessionSummarySystemPrompt(lens)},{role:'user',content:buildClientSessionSummaryInput({lens,window,captures:selectedCaptures,careItems:careItems||[],therapistGuidance})}],
      responseFormat:{type:'json_object'}, temperature:0.2, maxTokens:2600
    });
    const structured = validateClientSessionSummaryResponse(completion.choices?.[0]?.message?.content,validSourceIds);
    if (!structured) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Client summary generation is temporarily unavailable.' } });
    const body = renderClientSessionSummary(structured.sections, lens);
    if (body.length < 120) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Client summary generation is temporarily unavailable.' } });
    const sources=[...evidenceMap.reviewedSessions.map(item=>({id:item.id,kind:'session_capture',sessionId:item.sessionId,occurredAt:item.occurredAt,reviewedAt:item.reviewedAt})),...evidenceMap.currentAcceptedCareContext.map(item=>({id:item.id,kind:'accepted_care',careKind:item.kind})),...(evidenceMap.therapistAuthoredContext.content?[{id:'therapist:guidance',kind:'therapist_guidance'}]:[])];
    return res.status(200).json({ success:true, data:{ generationId,generatedAt,draft:{body,sections:structured.sections},claims:structured.claims,sources,lens,window,sessionCount:selectedCaptures.length,promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,model,usage:{inputTokens:Number(completion.usage?.prompt_tokens||0),outputTokens:Number(completion.usage?.completion_tokens||0),totalTokens:Number(completion.usage?.total_tokens||0)} } });
  } catch (error) {
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) return res.status(504).json({ success:false, error:{ code:'GATEWAY_TIMEOUT', message:'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'Client summary generation is temporarily unavailable.' } });
    console.error('[Client Session Summary] Error:', error.message);
    const status=error.status||500; return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':(error.code||'INTERNAL_SERVER_ERROR'), message:status===401?'Please sign in again.':'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
  }
}
