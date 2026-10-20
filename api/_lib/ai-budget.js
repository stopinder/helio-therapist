import { getSupabaseClient } from './supabase.js';

// Product allowance: five short, low-cost text actions per UTC calendar month.
// Always let the database decide whether an account is Free, paid or grandfathered.
export const FREE_AI_MONTHLY_ACTIONS = 5;
export const FREE_AI_MAX_INPUT_CHARS = 12_000;
export const FREE_AI_MAX_OUTPUT_TOKENS = 1_000;
export const FREE_AI_TEXT_MODEL = 'gpt-4o-mini';

const BUDGET_ERRORS = {
  FREE_AI_MONTHLY_LIMIT: [429, 'Your five Free AI actions for this month are used. Upgrade to Professional for more AI processing.'],
  FREE_AI_GLOBAL_LIMIT: [503, 'Free AI is temporarily at capacity. Your workspace remains available; Professional AI is unaffected.'],
  FREE_AI_INPUT_TOO_LARGE: [413, 'This request is too long for the Free AI allowance. Shorten the text or upgrade to Professional.'],
  DICTATION_DAILY_LIMIT_EXCEEDED: [429, "You've reached today's free dictation allowance. Dictation will be available again tomorrow."],
  DICTATION_RATE_LIMIT_EXCEEDED: [429, 'Please wait a few minutes before starting another dictation.']
};

export async function checkDictationFairUse({ userId, durationSeconds, supabase = getSupabaseClient() }) {
  if (!userId) throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  let response;
  try {
    response = await supabase.rpc('check_dictation_fair_use', {
      p_user_id: userId,
      p_duration_seconds: Math.ceil(durationSeconds)
    });
  } catch (error) {
    throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  }
  if (response?.error) {
    for (const [code, [status, message]] of Object.entries(BUDGET_ERRORS)) {
      if (String(response.error.message || '').includes(code)) throw budgetError(code, status, message);
    }
    throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  }
  return true;
}

export function budgetError(code, status, message) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

/**
 * Atomically reserves the Free credit in Postgres before any provider request.
 * Returns null for paid/legacy accounts; number 1..5 for a Free reservation.
 * A failed provider call STILL consumes the credit, preventing billing loopholes.
 */
export async function reserveAiBudget({
  userId, feature, requestChars = 0, maxOutputTokens = 0,
  supabase = getSupabaseClient()
}) {
  if (!userId || !feature) throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  let response;
  try {
    response = await supabase.rpc('reserve_free_ai_action', {
      p_user_id: userId,
      p_feature: feature,
      p_request_chars: requestChars,
      p_max_output_tokens: maxOutputTokens
    });
  } catch (error) {
    throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  }
  if (response?.error) {
    for (const [code, [status, message]] of Object.entries(BUDGET_ERRORS)) {
      if (String(response.error.message || '').includes(code)) throw budgetError(code, status, message);
    }
    throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
  }
  const used = response?.data;
  if (used === null) return null;
  if (Number.isInteger(used) && used >= 1 && used <= FREE_AI_MONTHLY_ACTIONS) return used;
  throw budgetError('AI_BUDGET_UNAVAILABLE', 503, 'AI allowance could not be checked.');
}

export function isBudgetError(error) {
  return Boolean(error?.code && (error.code in BUDGET_ERRORS || error.code === 'AI_BUDGET_UNAVAILABLE'));
}
