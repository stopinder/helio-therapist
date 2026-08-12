import OpenAI from 'openai';
import { getSupabaseClient } from './supabase.js';

export const AI_FEATURES = Object.freeze({
  REFLECTION_ANALYSIS: 'reflection.analysis',
  REFLECTION_REPHRASE: 'reflection.rephrase',
  SUPERVISION_SUMMARY: 'reflection.supervision_summary'
});

const DEFAULT_TEXT_MODEL = 'gpt-4o-mini';

// USD per 1M tokens. Keep pricing policy central and versioned so historical
// estimates remain interpretable when provider prices change.
export const AI_PRICING_VERSION = 'openai-2024-07-18';
export const MODEL_PRICING_USD_PER_MILLION = Object.freeze({
  'gpt-4o-mini': { input: 0.15, output: 0.60 }
});

export function getTextModel(feature) {
  if (feature === AI_FEATURES.REFLECTION_ANALYSIS || feature === AI_FEATURES.REFLECTION_REPHRASE) {
    return process.env.OPENAI_REFLECTION_MODEL || DEFAULT_TEXT_MODEL;
  }
  return process.env.OPENAI_SUPERVISION_MODEL || DEFAULT_TEXT_MODEL;
}

export function estimateTextCostUsd(model, usage = {}) {
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing) return null;
  const inputTokens = Number(usage.prompt_tokens || 0);
  const outputTokens = Number(usage.completion_tokens || 0);
  return ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1_000_000;
}

export function buildUsageRecord({ feature, userId, model, promptVersion = null, usage = {}, status, latencyMs, errorCode = null }) {
  return {
    user_id: userId,
    feature,
    provider: 'openai',
    model,
    prompt_version: promptVersion,
    pricing_version: AI_PRICING_VERSION,
    input_tokens: Number(usage.prompt_tokens || 0),
    output_tokens: Number(usage.completion_tokens || 0),
    total_tokens: Number(usage.total_tokens || 0),
    estimated_cost_usd: estimateTextCostUsd(model, usage),
    status,
    latency_ms: Math.max(0, Math.round(latencyMs || 0)),
    error_code: errorCode
  };
}

async function persistUsage(record) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('ai_usage_events').insert(record);
    if (error) console.error('[AI Usage] Failed to persist usage event:', error.message);
  } catch (error) {
    // Telemetry must never turn a successful clinical-support request into a failure.
    console.error('[AI Usage] Failed to persist usage event:', error.message);
  }
}

export async function runTextAI({
  feature,
  userId,
  promptVersion = null,
  messages,
  temperature,
  maxTokens,
  responseFormat,
  timeout = 20000
}) {
  if (!Object.values(AI_FEATURES).includes(feature)) throw new Error(`Unknown AI feature: ${feature}`);
  if (!userId) throw new Error('AI execution requires an authenticated user ID');
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is missing');
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const model = getTextModel(feature);
  const startedAt = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...(temperature === undefined ? {} : { temperature }),
      ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
      ...(responseFormat === undefined ? {} : { response_format: responseFormat })
    });
    const latencyMs = Date.now() - startedAt;
    await persistUsage(buildUsageRecord({
      feature, userId, model, promptVersion, usage: completion.usage, status: 'succeeded', latencyMs
    }));
    return { completion, model };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    await persistUsage(buildUsageRecord({
      feature, userId, model, promptVersion, status: 'failed', latencyMs,
      errorCode: String(error.code || error.status || error.name || 'AI_PROVIDER_ERROR').slice(0, 100)
    }));
    throw error;
  }
}
