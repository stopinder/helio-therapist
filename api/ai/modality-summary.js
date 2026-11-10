import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { createTextAIWorkflow, AI_FEATURES } from '../_lib/ai-execution.js';
import { isBudgetError } from '../_lib/ai-budget.js';
import { effectiveSummaryOptions, summaryInstructionRequirements, resourceAppendix } from '../../src/lib/summaryAuthoring.js';
import { INTELLIGENCE_VERSION, getSummaryModality, normalizeIntelligenceOptions } from '../../src/lib/summaryModalities.js';
import { verifySummaryResource } from '../_lib/summary-resource-check.js';
import { loadModalitySources, verifyModalitySources, listModalityAvailability } from '../_lib/modality-intelligence/sources.js';
import { runModalityPipeline } from '../_lib/modality-intelligence/pipeline.js';
import { failure } from '../_lib/modality-intelligence/contracts.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseModalityRequest(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw failure('INVALID_REQUEST','Choose valid clinical sources and summary options.',400);
  const { clientId, sessionId = null, anchorSessionId = null, transcriptId = null, scope = 'encounter', window = 'current', lens = 'integrative', action = 'generate', therapistGuidance = '', refinementRequest = '', previousDraft = '' } = body;
  if (typeof clientId !== 'string' || !UUID.test(clientId) || [sessionId,anchorSessionId,transcriptId].some(id=>id !== null && (typeof id !== 'string' || !UUID.test(id))) ||
      !['encounter','longitudinal'].includes(scope) || !['current','recent','last_three','last_five','history'].includes(window) ||
      typeof lens !== 'string' || !['generate','sources','availability'].includes(action) || (scope === 'encounter' && !sessionId && action !== 'availability') ||
      typeof therapistGuidance !== 'string' || therapistGuidance.length > 6000 || typeof refinementRequest !== 'string' || refinementRequest.length > 1800 ||
      typeof previousDraft !== 'string' || previousDraft.length > 10000 || (refinementRequest.trim() && !previousDraft.trim())) throw failure('INVALID_REQUEST','Choose valid clinical sources and summary options.',400);
  getSummaryModality(lens);
  return { clientId,sessionId,anchorSessionId,transcriptId,scope,window,lens,action,therapistGuidance,refinementRequest,previousDraft,
    intelligenceOptions:normalizeIntelligenceOptions(body.intelligenceOptions),summaryOptions:effectiveSummaryOptions(body.summaryOptions || {},therapistGuidance,refinementRequest) };
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({success:false,error:{code:'METHOD_NOT_ALLOWED',message:'Method not allowed'}}); }
  try {
    const {supabase,user} = await requireAuthenticatedUser(req);
    const request = parseModalityRequest(req.body);
    if(request.action==='availability')return res.status(200).json({success:true,data:{availableSessions:await listModalityAvailability(supabase,user.id,request.clientId)}});
    const pack = await loadModalitySources(supabase,user.id,request,{forViewing:request.action==='sources'});
    if (request.action === 'sources') return res.status(200).json({success:true,data:{zoomSummaries:pack.zoomSummaries,sessionCount:pack.sessions.length,sourceTypes:[...new Set(pack.sources.map(source=>source.type))],warnings:pack.warnings}});
    const {data:sampleVerified,error:sampleError} = await supabase.rpc('is_sample_client',{p_user_id:user.id,p_client_id:request.clientId});
    if (sampleError) throw sampleError;
    if (sampleVerified === true) throw failure('SAMPLE_MODALITY_PREVIEW_UNAVAILABLE','Sample Practice retains its fixed demonstrations. Use reviewed material from your own practice for this modality preview; no AI allowance was used.',409);
    const requirements = { ...summaryInstructionRequirements(request.therapistGuidance,request.refinementRequest,request.summaryOptions),
      requiresSuppliedSequence:/as (?:I |we |you )?(?:described|taught|practised)|exact (?:steps|sequence)|use (?:my|the recorded) (?:steps|sequence)/i.test(request.therapistGuidance+' '+request.refinementRequest) };
    if (request.intelligenceOptions.mode==='therapist_formulation' && requirements.exercise) throw failure('FORMULATION_ADDITION_MISMATCH','Choose Client summary to prepare the requested practice instructions. Therapist formulation is a separate working view.',400);
    const resourceVerification = await verifySummaryResource(request.summaryOptions.resource);
    const run = await createTextAIWorkflow({feature:AI_FEATURES.CLIENT_SESSION_SUMMARY,userId:user.id,maxCalls:request.intelligenceOptions.mode==='therapist_formulation'?2:4,maxInputChars:500000,maxOutputTokens:16500});
    const result = await runModalityPipeline({pack,lens:request.lens,options:request.intelligenceOptions,summaryOptions:request.summaryOptions,requirements,therapistGuidance:request.therapistGuidance,refinementRequest:request.refinementRequest,previousDraft:request.previousDraft,run});
    await verifyModalitySources(supabase,user.id,request,pack);
    if (result.outcome !== 'ready') return res.status(200).json({success:true,data:result});
    if (result.mode==='client_summary') result.draft.body += resourceAppendix(request.summaryOptions.resource,resourceVerification);
    return res.status(200).json({success:true,data:{...result,generationId:randomUUID(),generatedAt:new Date().toISOString(),promptVersion:INTELLIGENCE_VERSION,
      lens:request.lens,window:request.window,sessionCount:pack.sessionCount,sources:pack.manifest,reviewCautions:pack.warnings,summaryOptions:request.summaryOptions,
      intelligenceOptions:request.intelligenceOptions,reviewRequired:true,qualityReview:{kind:'source_and_contract_checks',warnings:pack.warnings},
      resourceSelection:request.summaryOptions.resource?{...request.summaryOptions.resource,verification:resourceVerification}:null}});
  } catch(error) {
    if(error.code==='SOURCE_REVIEW_REQUIRED') return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:error.message,sources:error.review?[error.review]:[]}}});
    // Never log clinical content, prompts, generated text, identities, URLs or provider error bodies.
    console.warn('[Modality intelligence]',String(error.code || error.name || 'UNAVAILABLE').slice(0,80));
    const permitted = error.code && (isBudgetError(error) || error.status < 500);
    return res.status(error.status || 500).json({success:false,error:{code:error.code || 'INTELLIGENCE_UNAVAILABLE',message:permitted?error.message:'Clinical intelligence is temporarily unavailable. Your existing work is unchanged.'}});
  }
}
