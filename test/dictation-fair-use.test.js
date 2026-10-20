import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkDictationFairUse,
  isBudgetError
} from '../api/_lib/ai-budget.js';

const migration = readFileSync(new URL('../supabase/migrations/20261020221801_dictation_fair_use.sql', import.meta.url), 'utf8');
const transcribe = readFileSync(new URL('../api/ai/transcribe.js', import.meta.url), 'utf8');

function client(data, error = null) {
  const calls = [];
  return { calls, rpc: async (...args) => { calls.push(args); return { data, error }; } };
}

test('Dictation fair-use RPC is defined correctly in migration', () => {
  assert.match(migration, /create table if not exists private\.dictation_usage/);
  assert.match(migration, /check_dictation_fair_use/);
  assert.match(migration, /v_daily_limit integer := 1800/);
  assert.match(migration, /v_rate_limit_count integer := 10/);
  assert.match(migration, /security definer/);
  assert.match(migration, /to service_role/);
});

test('checkDictationFairUse calls the RPC with duration', async () => {
  const db = client(null);
  await checkDictationFairUse({
    userId: 'user-123',
    durationSeconds: 45.5,
    supabase: db
  });
  assert.deepEqual(db.calls, [[ 'check_dictation_fair_use', {
    p_user_id: 'user-123',
    p_duration_seconds: 46
  } ]]);
});

test('Daily limit exhaustion is handled correctly', async () => {
  const db = client(null, { message: 'DICTATION_DAILY_LIMIT_EXCEEDED', code: 'P0001' });
  await assert.rejects(
    checkDictationFairUse({ userId: 'user-123', durationSeconds: 10, supabase: db }),
    e => e.status === 429 && e.code === 'DICTATION_DAILY_LIMIT_EXCEEDED' && isBudgetError(e)
  );
});

test('Rate limit exhaustion is handled correctly', async () => {
  const db = client(null, { message: 'DICTATION_RATE_LIMIT_EXCEEDED', code: 'P0001' });
  await assert.rejects(
    checkDictationFairUse({ userId: 'user-123', durationSeconds: 10, supabase: db }),
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

test('Transcription endpoint uses both general budget and fair-use check', () => {
  assert.match(transcribe, /await reserveAiBudget\(/);
  assert.match(transcribe, /await checkDictationFairUse\(/);
});

test('Dictation never consumes clinical AI credits', () => {
  // Verified by looking at unmetered_dictation.sql which we know returns NULL for audio.transcription
  const unmeteredMigration = readFileSync(new URL('../supabase/migrations/20261020220534_unmetered_dictation.sql', import.meta.url), 'utf8');
  assert.match(unmeteredMigration, /if p_feature = 'audio.transcription' then\s+return null;/);
});
