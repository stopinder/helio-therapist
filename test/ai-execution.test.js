import assert from 'node:assert';
import test from 'node:test';
import {
  AI_FEATURES,
  AI_PRICING_VERSION,
  buildUsageRecord,
  estimateTextCostUsd,
  getTextModel,
  runTextAI,
  buildTokenLimitParams
} from '../api/_lib/ai-execution.js';

test('AI execution: known model cost is estimated from input and output tokens', () => {
  const cost = estimateTextCostUsd('gpt-4o-mini', { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 });
  assert.strictEqual(cost, 0.75);
});

test('AI execution: cached input tokens use the cached input rate', () => {
  const cost = estimateTextCostUsd('gpt-4o-mini', {
    prompt_tokens: 1_000_000,
    prompt_tokens_details: { cached_tokens: 400_000 },
    completion_tokens: 0
  });
  assert.strictEqual(cost, 0.12);
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
    usage: { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 25 }, completion_tokens: 50, total_tokens: 150 },
    status: 'succeeded',
    latencyMs: 123.7
  });

  assert.strictEqual(record.feature, 'reflection.analysis');
  assert.strictEqual(record.pricing_version, AI_PRICING_VERSION);
  assert.strictEqual(record.input_tokens, 100);
  assert.strictEqual(record.cached_input_tokens, 25);
  assert.strictEqual(record.output_tokens, 50);
  assert.strictEqual(record.total_tokens, 150);
  assert.strictEqual(record.latency_ms, 124);
  for (const forbidden of ['messages', 'prompt', 'content', 'reflection', 'transcript']) {
    assert.ok(!(forbidden in record));
  }
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

test('AI execution: transcript clinical summary has an independent model override', () => {
  const previous = process.env.OPENAI_CLINICAL_SUMMARY_MODEL;
  process.env.OPENAI_CLINICAL_SUMMARY_MODEL = 'test-clinical-summary-model';
  try {
    assert.strictEqual(AI_FEATURES.TRANSCRIPT_CLINICAL_SUMMARY, 'transcript.clinical_summary');
    assert.strictEqual(getTextModel(AI_FEATURES.TRANSCRIPT_CLINICAL_SUMMARY), 'test-clinical-summary-model');
  } finally {
    if (previous === undefined) delete process.env.OPENAI_CLINICAL_SUMMARY_MODEL;
    else process.env.OPENAI_CLINICAL_SUMMARY_MODEL = previous;
  }
});

test('AI execution: missing provider configuration is a 503-class error', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      runTextAI({ feature: AI_FEATURES.REFLECTION_ANALYSIS, userId: '00000000-0000-0000-0000-000000000001', messages: [] }),
      error => error.code === 'AI_PROVIDER_NOT_CONFIGURED' && error.status === 503
    );
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});

test('AI execution: buildTokenLimitParams maps maxTokens correctly by model', () => {
  // gpt-5.6-terra requires max_completion_tokens
  const terraParams = buildTokenLimitParams('gpt-5.6-terra', 1000);
  assert.strictEqual(terraParams.max_completion_tokens, 1000);
  assert.ok(!('max_tokens' in terraParams));

  // gpt-4o-mini retains max_tokens
  const miniParams = buildTokenLimitParams('gpt-4o-mini', 500);
  assert.strictEqual(miniParams.max_tokens, 500);
  assert.ok(!('max_completion_tokens' in miniParams));

  // undefined maxTokens emits neither parameter
  const emptyParams = buildTokenLimitParams('gpt-5.6-terra', undefined);
  assert.deepStrictEqual(emptyParams, {});
});
