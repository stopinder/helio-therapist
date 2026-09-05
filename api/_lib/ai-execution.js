import OpenAI from 'openai';
import { getSupabaseClient } from './supabase.js';

export const AI_FEATURES = Object.freeze({
  REFLECTION_ANALYSIS: 'reflection.analysis',
  REFLECTION_REPHRASE: 'reflection.rephrase',
  SUPERVISION_SUMMARY: 'reflection.supervision_summary',
  TRANSCRIPT_CLINICAL_SUMMARY: 'transcript.clinical_summary',
  TRANSCRIPT_DRAFT_CLINICAL_NOTE: 'transcript.draft_clinical_note',
  CARE_SUGGESTIONS: 'care.suggestions',
  TRANSCRIPT_CBT_CARE_SUGGESTIONS: 'transcript.cbt_care_suggestions',
  CLIENT_SESSION_SUMMARY: 'client.session_summary'
});

const DEFAULT_TEXT_MODEL = 'gpt-4o-mini';
const CLIENT_SESSION_SUMMARY_MODEL = 'gpt-5.6-terra';
export const AI_PRICING_VERSION = 'openai-2026-07-30';
export const MODEL_PRICING_USD_PER_MILLION = Object.freeze({
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.60 },
  'gpt-5.6-terra': { input: 2.00, cachedInput: 0.20, output: 12.00 }
});

export function getTextModel(feature) {
  if (feature === AI_FEATURES.REFLECTION_ANALYSIS || feature === AI_FEATURES.REFLECTION_REPHRASE) return process.env.OPENAI_REFLECTION_MODEL || DEFAULT_TEXT_MODEL;
  if (feature === AI_FEATURES.TRANSCRIPT_CLINICAL_SUMMARY) return process.env.OPENAI_CLINICAL_SUMMARY_MODEL || DEFAULT_TEXT_MODEL;
  if (feature === AI_FEATURES.TRANSCRIPT_DRAFT_CLINICAL_NOTE) return process.env.OPENAI_DRAFT_CLINICAL_NOTE_MODEL || DEFAULT_TEXT_MODEL;
  if (feature === AI_FEATURES.CARE_SUGGESTIONS || feature === AI_FEATURES.TRANSCRIPT_CBT_CARE_SUGGESTIONS) return process.env.OPENAI_CARE_MODEL || DEFAULT_TEXT_MODEL;
  if (feature === AI_FEATURES.CLIENT_SESSION_SUMMARY) return process.env.OPENAI_CLIENT_SUMMARY_MODEL || CLIENT_SESSION_SUMMARY_MODEL;
  return process.env.OPENAI_SUPERVISION_MODEL || DEFAULT_TEXT_MODEL;
}

function getCachedInputTokens(usage = {}) { return Number(usage.prompt_tokens_details?.cached_tokens || 0); }
export function estimateTextCostUsd(model, usage = {}) { const pricing=MODEL_PRICING_USD_PER_MILLION[model]; if(!pricing)return null; const inputTokens=Number(usage.prompt_tokens||0),cachedInputTokens=Math.min(inputTokens,getCachedInputTokens(usage)),uncachedInputTokens=Math.max(0,inputTokens-cachedInputTokens),outputTokens=Number(usage.completion_tokens||0); return ((uncachedInputTokens*pricing.input)+(cachedInputTokens*pricing.cachedInput)+(outputTokens*pricing.output))/1_000_000; }
export function buildUsageRecord({ feature,userId,model,promptVersion=null,usage={},status,latencyMs,errorCode=null }) { return { user_id:userId,feature,provider:'openai',model,prompt_version:promptVersion,pricing_version:AI_PRICING_VERSION,input_tokens:Number(usage.prompt_tokens||0),cached_input_tokens:getCachedInputTokens(usage),output_tokens:Number(usage.completion_tokens||0),total_tokens:Number(usage.total_tokens||0),estimated_cost_usd:estimateTextCostUsd(model,usage),status,latency_ms:Math.max(0,Math.round(latencyMs||0)),error_code:errorCode }; }
async function persistUsage(record) { try { const supabase=getSupabaseClient(); const {error}=await supabase.from('ai_usage_events').insert(record); if(error)console.error('[AI Usage] Failed to persist usage event:',error.message); } catch(error) { console.error('[AI Usage] Failed to persist usage event:',error.message); } }
export function buildTokenLimitParams(model, maxTokens) {
  if (maxTokens === undefined) return {};
  if (model === 'gpt-5.6-terra') {
    return { max_completion_tokens: maxTokens };
  }
  // Default to max_tokens for gpt-4o-mini and others unless known to require the new param
  return { max_tokens: maxTokens };
}

export async function runTextAI({ feature,userId,promptVersion=null,messages,temperature,maxTokens,responseFormat,timeout=20000 }) { if(!Object.values(AI_FEATURES).includes(feature))throw new Error(`Unknown AI feature: ${feature}`); if(!userId)throw new Error('AI execution requires an authenticated user ID'); if(!process.env.OPENAI_API_KEY){const error=new Error('OPENAI_API_KEY is missing');error.code='AI_PROVIDER_NOT_CONFIGURED';error.status=503;throw error;} const model=getTextModel(feature),startedAt=Date.now(),openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout}); try { const completion=await openai.chat.completions.create({model,messages,...(temperature===undefined?{}:{temperature}),...buildTokenLimitParams(model, maxTokens),...(responseFormat===undefined?{}:{response_format:responseFormat})}); const latencyMs=Date.now()-startedAt; await persistUsage(buildUsageRecord({feature,userId,model,promptVersion,usage:completion.usage,status:'succeeded',latencyMs})); return {completion,model}; } catch(error) { const latencyMs=Date.now()-startedAt; await persistUsage(buildUsageRecord({feature,userId,model,promptVersion,status:'failed',latencyMs,errorCode:String(error.code||error.status||error.name||'AI_PROVIDER_ERROR').slice(0,100)})); throw error; } }
