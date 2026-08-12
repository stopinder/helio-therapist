import assert from 'node:assert';
import test from 'node:test';
import {
  AI_FEATURES,
  AI_PRICING_VERSION,
  buildUsageRecord,
  estimateTextCostUsd,
  getTextModel
} from '../api/_lib/ai-execution.js';

test('AI execution: known model cost is estimated from input and output tokens', () => {
  const cost = estimateTextCostUsd('gpt-4o-mini', { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 });
  assert.strictEqual(cost, 0.75);
});

test('AI execution: cached input receives the provider cached-token rate', () => {
  const cost = estimateTextCostUsd('gpt-4o-mini', {
    prompt_tokens: 1_000_000,
    prompt_tokens_details: { cached_tokens: 1_000_000 },
    completion_tokens: 0
  });
  assert.strictEqual(cost, 0.075);
});

test('AI execution: unknown model pricing is explicit rather than guessed', () => {
  assert.strictEqual(estimateTextCostUsd('unknown-model', { prompt_tokens: 100 }), null);
});

test('AI execution: usage records contain accounting metadata but no prompt or clinical content', () => {
  const record = buildUsageRecord({
    feature: AI_FEATURES.REFLECTION_ANALYSIS,
    userId: '00000000-0000-0000-0000-000000000001',
    model: 'gpt-4o-mini',
    promptVersion: 'ai-reflection-v1',
    usage: { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 20 }, completion_tokens: 50, total_tokens: 150 },
    status: 'succeeded',
    latencyMs: 123.7
  });

  assert.strictEqual(record.feature, 'reflection.analysis');
  assert.strictEqual(record.pricing_version, AI_PRICING_VERSION);
  assert.strictEqual(record.input_tokens, 100);
  assert.strictEqual(record.cached_input_tokens, 20);
  assert.strictEqual(record.output_tokens, 50);
  assert.strictEqual(record.total_tokens, 150);
  assert.strictEqual(record.latency_ms, 124);
  for (const forbidden of ['messages', 'prompt', 'content', 'reflection', 'transcript']) assert.ok(!(forbidden in record));
});

test('AI execution: reflection model override remains backwards compatible', () => {
  const previous = process.env.OPENAI_REFLECTION_MODEL;
  process.env.OPENAI_REFLECTION_MODEL = 'test-reflection-model';
  try {
    assert.strictEqual(getTextModel(AI_FEATURES.REFLECTION_ANALYSIS), 'test-reflection-model');
    assert.strictEqual(getTextModel(AI_FEATURES.REFLECTION_REPHRASE), 'test-reflection-model');
  } finally {
    if (previous === undefined) delete process.env.OPENAI_REFLECTION_MODEL;
    else process.env.OPENAI_REFLECTION_MODEL = previous;
  }
});
