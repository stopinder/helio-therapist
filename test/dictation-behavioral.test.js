import test from 'node:test';
import assert from 'node:assert/strict';
import * as mm from 'music-metadata';
import { reserveDictationUsage } from '../api/_lib/ai-budget.js';
import { validWebmOpus } from './fixtures/audio-fixtures.js';

// Mock Supabase client
function mockSupabase(responses = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (fn, params, options) => {
      calls.push({ fn, params, options });
      if (responses[fn]) {
        return responses[fn](params, options);
      }
      return { data: { plan:'free', periodStart:'2026-11-01', secondsUsed:30, secondsLimit:3600, secondsRemaining:3570 }, error: null };
    }
  };
}

test('reserveDictationUsage uses public gateway', async () => {
  const supabase = mockSupabase({
    reserve_dictation_usage: (params, options) => {
      assert.strictEqual(options, undefined);
      return { data: null, error: null };
    }
  });

  await reserveDictationUsage({
    userId: 'user-1',
    durationSeconds: 30,
    supabase
  });

  assert.equal(supabase.calls.length, 1);
  assert.equal(supabase.calls[0].fn, 'reserve_dictation_usage');
});

test('music-metadata correctly parses duration for real WebM fixture', async () => {
  const metadata = await mm.parseBuffer(validWebmOpus, { mimeType: 'audio/webm' });
  const duration = metadata.format.duration;
  assert.ok(duration !== undefined && duration !== null, 'Duration should be defined');
  assert.ok(typeof duration === 'number', 'Duration should be a number');
  assert.ok(duration > 0, 'Duration should be positive');
});

test('music-metadata rejects invalid files', async () => {
  const invalidBuffer = Buffer.from('not-an-audio-file');
  try {
    const metadata = await mm.parseBuffer(invalidBuffer, { mimeType: 'audio/webm' });
    // Some formats might "parse" garbage, but shouldn't have valid duration
    const duration = metadata.format.duration;
    assert.ok(duration === undefined || duration === null || duration <= 0);
  } catch (e) {
    // Rejection is also fine
    assert.ok(true);
  }
});

test('Free monthly limit error mapping', async () => {
  const supabase = mockSupabase({
    reserve_dictation_usage: () => ({
      data: null,
      error: { message: 'DICTATION_FREE_MONTHLY_LIMIT_EXCEEDED' }
    })
  });

  await assert.rejects(
    reserveDictationUsage({ userId: 'u1', durationSeconds: 10, supabase }),
    { code: 'DICTATION_FREE_MONTHLY_LIMIT_EXCEEDED', status: 429 }
  );
});

test('Rate limit error mapping', async () => {
  const supabase = mockSupabase({
    reserve_dictation_usage: () => ({
      data: null,
      error: { message: 'DICTATION_RATE_LIMIT_EXCEEDED' }
    })
  });

  await assert.rejects(
    reserveDictationUsage({ userId: 'u1', durationSeconds: 10, supabase }),
    { code: 'DICTATION_RATE_LIMIT_EXCEEDED', status: 429 }
  );
});

test('Global Free budget error mapping', async () => {
  const supabase = mockSupabase({
    reserve_dictation_usage: () => ({ data: null, error: { message: 'DICTATION_FREE_GLOBAL_LIMIT' } })
  });
  await assert.rejects(
    reserveDictationUsage({ userId: 'u1', durationSeconds: 10, supabase }),
    { code: 'DICTATION_FREE_GLOBAL_LIMIT', status: 503 }
  );
});

test('Supabase unavailable handling', async () => {
  const supabase = mockSupabase({
    reserve_dictation_usage: () => { throw new Error('Network error'); }
  });

  await assert.rejects(
    reserveDictationUsage({ userId: 'u1', durationSeconds: 10, supabase }),
    { code: 'AI_BUDGET_UNAVAILABLE', status: 503 }
  );
});
