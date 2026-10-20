import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FREE_AI_MONTHLY_ACTIONS,
  FREE_AI_MAX_INPUT_CHARS,
  FREE_AI_MAX_OUTPUT_TOKENS,
  FREE_AI_TEXT_MODEL,
  isBudgetError,
  reserveAiBudget
} from '../api/_lib/ai-budget.js';

const migration = readFileSync(new URL('../supabase/migrations/20261020154114_free_ai_monthly_budget.sql', import.meta.url), 'utf8');
const aiEngine = readFileSync(new URL('../api/_lib/ai-execution.js', import.meta.url), 'utf8');
const transcribe = readFileSync(new URL('../api/ai/transcribe.js', import.meta.url), 'utf8');

function client(data, error = null) {
  const calls = [];
  return { calls, rpc: async (...args) => { calls.push(args); return { data, error }; } };
}

test('Free budget is deliberately bounded and low cost', () => {
  assert.equal(FREE_AI_MONTHLY_ACTIONS, 5);
  assert.equal(FREE_AI_MAX_INPUT_CHARS, 12000);
  assert.equal(FREE_AI_MAX_OUTPUT_TOKENS, 1000);
  assert.equal(FREE_AI_TEXT_MODEL, 'gpt-4o-mini');
  assert.match(migration, /used < 5/);
  assert.match(migration, /between 0 and 5/);
  assert.match(migration, /between 0 and 500/);
  assert.match(migration, /free_ai_global_monthly_usage/);
  assert.match(migration, /period_start date/);
});

test('reserveAiBudget calls the server-only atomic RPC with no clinical input', async () => {
  const db = client(2);
  assert.equal(await reserveAiBudget({
    userId: 'example-user', feature: 'reflection.analysis', requestChars: 1000,
    maxOutputTokens: 500, supabase: db
  }), 2);
  assert.deepEqual(db.calls, [[ 'reserve_free_ai_action', {
    p_user_id: 'example-user', p_feature: 'reflection.analysis',
    p_request_chars: 1000, p_max_output_tokens: 500
  } ]]);
});

test('paid and grandfathered accounts get a null reservation from DB', async () => {
  assert.equal(await reserveAiBudget({ userId: 'paid-user', feature: 'reflection.analysis', supabase: client(null) }), null);
});

test('Free limit exhaustion produces a stable 429 and is not bypassed', async () => {
  await assert.rejects(
    reserveAiBudget({ userId: 'free-user', feature: 'reflection.analysis', supabase: client(null, { message: 'FREE_AI_MONTHLY_LIMIT', code: 'P0001' }) }),
    e => e.status === 429 && e.code === 'FREE_AI_MONTHLY_LIMIT' && isBudgetError(e)
  );
});

test('Free audio, oversize requests, missing RPC and malformed data fail closed', async () => {
  const examples = [
    [{ message: 'FREE_AUDIO_NOT_INCLUDED' }, 403],
    [{ message: 'FREE_AI_GLOBAL_LIMIT' }, 503],
    [{ message: 'FREE_AI_INPUT_TOO_LARGE' }, 413],
    [{ message: 'function public.reserve_free_ai_action is missing', code: 'PGRST202' }, 503]
  ];
  for (const [error, status] of examples) {
    await assert.rejects(reserveAiBudget({
      userId: 'free-user', feature: 'audio.transcription', supabase: client(null, error)
    }), e => e.status === status && isBudgetError(e));
  }
  await assert.rejects(reserveAiBudget({
    userId: 'free-user', feature: 'reflection.analysis', supabase: client(6)
  }), { code: 'AI_BUDGET_UNAVAILABLE', status: 503 });
  await assert.rejects(reserveAiBudget({
    userId: 'free-user', feature: 'reflection.analysis',
    supabase: { rpc: async () => { throw new Error('database offline'); } }
  }), { code: 'AI_BUDGET_UNAVAILABLE', status: 503 });
});

test('all text AI provider calls reserve before OpenAI, clamp Free model and tokens', () => {
  const reservePos = aiEngine.indexOf('const usedFreeCredits = await reserveAiBudget');
  const providerPos = aiEngine.indexOf('await openai.chat.completions.create');
  assert.ok(reservePos >= 0 && providerPos > reservePos);
  assert.match(aiEngine, /isFree \? FREE_AI_TEXT_MODEL : getTextModel\(feature\)/);
  assert.match(aiEngine, /Math.min\(maxTokens, FREE_AI_MAX_OUTPUT_TOKENS\)/);
  assert.match(aiEngine, /maxRetries: 0/);
});

test('the separate Whisper endpoint also checks Free budget BEFORE calling provider', () => {
  const reservePos = transcribe.indexOf('await reserveAiBudget(');
  const providerPos = transcribe.indexOf('await client.audio.transcriptions.create(');
  assert.ok(reservePos >= 0 && providerPos > reservePos);
  assert.match(transcribe, /feature: 'audio.transcription'/);
  assert.match(transcribe, /isBudgetError\(error\)/);
});

test('RPC is service-role-only; the private table is not Data API writable', () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /to service_role/);
  assert.match(migration, /revoke all on function public\.reserve_free_ai_action/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on private\.free_ai_monthly_usage/);
  assert.match(migration, /revoke all on private\.free_ai_global_monthly_usage/);
  assert.match(migration, /on conflict \(user_id, period_start\)/);
});
