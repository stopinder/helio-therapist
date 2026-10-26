import OpenAI from 'openai';
import { getSupabaseClient } from './supabase.js';
import { reserveAiBudget, FREE_AI_TEXT_MODEL } from './ai-budget.js';
import { AI_FEATURES, getTextModel, buildUsageRecord, buildTemperatureParams, buildTokenLimitParams } from './ai-execution.js';
import { executeResearchSession } from './research-session.js';
import { searchResearchDetailed } from './research-retrieval.js';
import { researchError } from './research-queries.js';

export async function runResearchAI({ userId, query, history }) {
  if (!process.env.OPENAI_API_KEY) throw researchError('AI_PROVIDER_NOT_CONFIGURED', 'Research is not configured', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(researchError('RESEARCH_TIMEOUT', 'The research request timed out', 504)), 55000);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 14000, maxRetries: 0 });
  try {
    return await executeResearchSession({ userId, query, history,
      reserve: reserveAiBudget, freeModel: FREE_AI_TEXT_MODEL, paidModel: getTextModel(AI_FEATURES.ASK_HELIOS_RESEARCH),
      signal: controller.signal, search: searchResearchDetailed,
      provider: ({ model, messages, maxTokens, signal }) => client.chat.completions.create({
        model, messages, response_format: { type: 'json_object' },
        ...buildTemperatureParams(model, 0.1), ...buildTokenLimitParams(model, maxTokens)
      }, { signal }),
      recordUsage: async args => {
        const { error } = await getSupabaseClient().from('ai_usage_events').insert(buildUsageRecord(args));
        if (error) console.error('[Research] usage logging unavailable');
      }
    });
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally { clearTimeout(timer); }
}
