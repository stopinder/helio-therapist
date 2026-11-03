import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  reserveDictationUsage,
  isBudgetError
} from '../api/_lib/ai-budget.js';

const migration = readFileSync(new URL('../supabase/migrations/20261103125000_dictation_cost_governor.sql', import.meta.url), 'utf8');
const transcribe = readFileSync(new URL('../api/ai/transcribe.js', import.meta.url), 'utf8');

function client(data, error = null) {
  const calls = [];
  return { calls, rpc: async (...args) => { calls.push(args); return { data, error }; } };
}

test('Dictation fair-use RPC is defined correctly in migration', () => {
  assert.match(migration, /create or replace function private\.reserve_dictation_usage/);
  assert.match(migration, /create or replace function public\.reserve_dictation_usage/);
  assert.match(migration, /free_monthly_seconds integer not null default 3600/);
  assert.match(migration, /professional_monthly_seconds integer not null default 60000/);
  assert.match(migration, /base_free_budget_gbp_pence integer not null default 2500/);
  assert.match(migration, /rate_limit_count integer not null default 10/);
  assert.match(migration, /security definer/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /if current_setting\('role'\) <> 'service_role'/);
  assert.match(migration, /to service_role/);
});

test('reserveDictationUsage calls the RPC with duration', async () => {
  const db = client({ plan:'free', periodStart:'2026-11-01', secondsUsed:46, secondsLimit:3600, secondsRemaining:3554 });
  const usage = await reserveDictationUsage({
    userId: 'user-123',
    durationSeconds: 45.5,
    supabase: db
  });
  assert.equal(usage.plan, 'free');
  assert.equal(usage.secondsRemaining, 3554);
  assert.deepEqual(db.calls, [[ 'reserve_dictation_usage', {
    p_user_id: 'user-123',
    p_duration_seconds: 46
  } ]]);
});

test('Free monthly limit exhaustion is handled correctly', async () => {
  const db = client(null, { message: 'DICTATION_FREE_MONTHLY_LIMIT_EXCEEDED', code: 'P0001' });
  await assert.rejects(
    reserveDictationUsage({ userId: 'user-123', durationSeconds: 10, supabase: db }),
    e => e.status === 429 && e.code === 'DICTATION_FREE_MONTHLY_LIMIT_EXCEEDED' && isBudgetError(e)
  );
});

test('Global Free dictation circuit breaker fails closed', async () => {
  const db = client(null, { message: 'DICTATION_FREE_GLOBAL_LIMIT', code: 'P0001' });
  await assert.rejects(
    reserveDictationUsage({ userId: 'user-123', durationSeconds: 10, supabase: db }),
    e => e.status === 503 && e.code === 'DICTATION_FREE_GLOBAL_LIMIT' && isBudgetError(e)
  );
});

test('Rate limit exhaustion is handled correctly', async () => {
  const db = client(null, { message: 'DICTATION_RATE_LIMIT_EXCEEDED', code: 'P0001' });
  await assert.rejects(
    reserveDictationUsage({ userId: 'user-123', durationSeconds: 10, supabase: db }),
    e => e.status === 429 && e.code === 'DICTATION_RATE_LIMIT_EXCEEDED' && isBudgetError(e)
  );
});

test('Transcription endpoint enforces 120s limit', () => {
  assert.match(transcribe, /const MAX_AUDIO_SECONDS = 120/);
  assert.match(transcribe, /if \(serverDuration > MAX_AUDIO_SECONDS\)/);
  assert.match(transcribe, /DICTATION_DURATION_EXCEEDED/);
});

test('Transcription endpoint enforces 3MB limit', () => {
  assert.match(transcribe, /const MAX_AUDIO_BYTES = 3 \* 1024 \* 1024/);
  assert.match(transcribe, /if \(audio\.length > MAX_AUDIO_BYTES\)/);
  assert.match(transcribe, /AUDIO_TOO_LARGE/);
});

test('Transcription endpoint reserves dictation before provider spend', () => {
  const reservePos = transcribe.indexOf('await reserveDictationUsage(');
  const providerPos = transcribe.indexOf('await client.audio.transcriptions.create(');
  assert.ok(reservePos >= 0 && providerPos > reservePos);
  assert.doesNotMatch(transcribe, /await reserveAiBudget\(/);
  assert.match(transcribe, /const model = 'gpt-transcribe'/);
});

test('Dictation never consumes clinical AI credits', () => {
  // Verified by looking at unmetered_dictation.sql which we know returns NULL for audio.transcription
  const unmeteredMigration = readFileSync(new URL('../supabase/migrations/20261020220534_unmetered_dictation.sql', import.meta.url), 'utf8');
  assert.match(unmeteredMigration, /if p_feature = 'audio.transcription' then\s+return null;/);
});
