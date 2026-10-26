import { RESEARCH_LIMITS, RESEARCH_WORKFLOW_VERSION, researchWorkflow } from './research-workflow.js';
import { researchError } from './research-queries.js';

// An internal server transaction, not a budget-bypass switch. The only route
// invoking it verifies the user's identity and conversation before it runs.
export async function executeResearchSession({ userId, query, history, reserve, provider, search, recordUsage,
  paidModel, freeModel, signal }) {
  if (!userId || typeof query !== 'string' || !query.trim() || query.length > 1200) throw researchError('QUERY_REQUIRED', 'Provide a question of up to 1,200 characters.', 400);
  const free = RESEARCH_LIMITS.free;
  const reservation = await reserve({ userId, feature: 'ask_helios.research', requestChars: free.input, maxOutputTokens: free.output });
  if (reservation !== null && !(Number.isInteger(reservation) && reservation >= 1 && reservation <= 5)) throw researchError('AI_BUDGET_UNAVAILABLE', 'Allowance unavailable', 503);
  const limits = reservation === null ? RESEARCH_LIMITS.paid : free;
  const model = reservation === null ? paidModel : freeModel;
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } };
  let calls = 0, inputChars = 0, outputAllocated = 0, status = 'failed', errorCode = null;
  const stages = ['plan', 'review', 'answer'];
  const start = Date.now();
  const complete = async ({ stage, messages, maxTokens }) => {
    signal?.throwIfAborted();
    const chars = JSON.stringify({ messages, responseFormat: { type: 'json_object' } }).length;
    if (stage !== stages[calls] || calls >= 3 || !Number.isInteger(maxTokens) || maxTokens <= 0 ||
        outputAllocated + maxTokens > limits.output || inputChars + chars > limits.input) {
      throw researchError('RESEARCH_BUDGET_EXCEEDED', 'Research workflow exceeded its limits', 413);
    }
    calls++; inputChars += chars; outputAllocated += maxTokens;
    const completion = await provider({ model, messages, maxTokens, signal });
    const u = completion.usage || {};
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) usage[key] += Number(u[key]) || 0;
    usage.prompt_tokens_details.cached_tokens += Number(u.prompt_tokens_details?.cached_tokens) || 0;
    if (completion.choices?.[0]?.finish_reason === 'length') throw researchError('RESEARCH_MODEL_FORMAT', 'Research response was truncated');
    const text = completion.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw researchError('RESEARCH_MODEL_FORMAT', 'Missing research response');
    return text;
  };
  try {
    const answer = await researchWorkflow({ query: query.trim(), history, complete, search, limits, signal });
    status = 'succeeded';
    return answer;
  } catch (error) {
    errorCode = error.code || 'RESEARCH_FAILED';
    throw error;
  } finally {
    // One usage event aggregates all internal model calls. As with existing AI
    // actions, a failed/no-results workflow after reservation is still charged.
    try { await recordUsage({ userId, feature: 'ask_helios.research', model, promptVersion: RESEARCH_WORKFLOW_VERSION,
      usage, status, latencyMs: Date.now() - start, errorCode }); } catch { /* Logging never hides a usable answer. */ }
  }
}
