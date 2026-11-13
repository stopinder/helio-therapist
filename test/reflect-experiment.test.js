import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CASES, DIMENSIONS, validateCases } from '../experiments/reflect/cases.mjs';
import { BASELINE_SYSTEM, CANDIDATE_SYSTEM, SETTINGS, productionHistory, makeMessages } from '../experiments/reflect/prompts.mjs';
import { plan, runExperiment, blindPacket, summarise, validateRunLimits, diagnosticFlags } from '../experiments/reflect/engine.mjs';
import { renderReview } from '../experiments/reflect/report.mjs';
import { parseArgs, selectCases, makeProvider } from '../scripts/evaluate-reflect.mjs';
const model = 'gpt-4o-2024-08-06'; // Fixed mocked transport identity; not proof of model availability.
const config = (cases = [CASES[0]], extra = {}) => ({ cases, repeats: 1, model, maxCalls: 400, maxOutputTokens: 260000, ...extra });
const fake = async body => ({ text: 'FIXTURE RESPONSE - NOT CLINICAL EVIDENCE', model: body.model, finishReason: 'stop', usage: { prompt_tokens: 100, completion_tokens: 12 } });
function review(run, id, preference = 'tie') {
  const side = () => ({ scores: Object.fromEntries(DIMENSIONS.map(d => [d, 2])), hardFailures: [] });
  return { runId: run.runId, reviewerId: id, qualifiedReviewer: true, ratings: run.pairs.map(p => ({ pairId: p.pairId, preference, reason: 'Fixture-only scoring, not a clinical judgement.', A: side(), B: side() })) };
}

test('48 synthetic scenarios span 12 categories with 12 multi-turn conversations and reserved cases', () => {
  assert.equal(validateCases(CASES), true);
  assert.equal(CASES.length, 48); assert.equal(new Set(CASES.map(c => c.category)).size, 12);
  assert.equal(CASES.filter(c => c.turns.length > 1).length, 12);
  assert.equal(CASES.filter(c => c.partition === 'reserved').length, 12);
  assert.ok(CASES.filter(c => c.safetyCritical).length >= 12);
});
test('all cases have criteria rather than scripted gold answers', () => {
  assert.ok(CASES.every(c => c.criteria.length >= 2 && !('expectedAnswer' in c)));
  assert.throws(() => validateCases([CASES[0], CASES[0]]));
  assert.throws(() => validateCases([{ ...CASES[0], synthetic: false }]));
});
test('baseline remains original; candidate has no mandatory paragraph or question recipe', () => {
  assert.match(BASELINE_SYSTEM, /two to four paragraphs with one thoughtful question/);
  assert.doesNotMatch(CANDIDATE_SYSTEM, /normally two to four paragraphs/);
  assert.match(CANDIDATE_SYSTEM, /No required opening/);
  assert.match(CANDIDATE_SYSTEM, /Boundaries outrank style/);
  assert.match(CANDIDATE_SYSTEM, /saved in conversation history/);
});
const assistPath = new URL('../api/ai/assist.js', import.meta.url);
test('frozen baseline equals the current production prompt; rebaseline explicitly on drift', { skip: !existsSync(assistPath) }, () => {
  const source = readFileSync(assistPath, 'utf8');
  const array = source.match(/const REFLECT_SYSTEM = \[([\s\S]*?)\]\.join\(' '\);/)?.[1];
  assert.ok(array, 'Production prompt layout changed; inspect before comparing');
  const lines = [...array.matchAll(/'([^'\n]*)'/g)].map(m => m[1]);
  assert.equal(lines.join(' '), BASELINE_SYSTEM);
  assert.match(source, /ask-helios-reflect\/1\.0\.0/);
});
test('same context limits and settings are applied to both arms', () => {
  const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(700) }));
  assert.equal(productionHistory(history).length, 6);
  assert.ok(productionHistory(history).every(m => m.content.length === 450));
  assert.deepEqual(makeMessages('baseline', 'Question', history).slice(1), makeMessages('candidate', 'Question', history).slice(1));
  assert.deepEqual(SETTINGS, { temperature: 0.35, max_tokens: 650, store: false });
  assert.throws(() => makeMessages('wrong', 'Question'));
  assert.throws(() => makeMessages('candidate', 'x'.repeat(1201)));
});
test('plan accounts for every turn, arm and repeat', () => {
  assert.equal(plan({ cases: CASES, repeats: 3 }).calls, 378);
  assert.equal(plan({ cases: CASES, repeats: 3 }).maxOutputTokens, 245700);
  assert.throws(() => plan({ repeats: 4 }));
});
test('limits fail before any provider call', async () => {
  let count = 0;
  await assert.rejects(runExperiment(config(CASES, { maxCalls: 1 }), async () => { count++; return fake({ model }); }));
  assert.equal(count, 0);
  assert.throws(() => validateRunLimits(config([CASES[0]], { model: 'gpt-4o' })));
  assert.throws(() => validateRunLimits(config([CASES[0]], { maxOutputTokens: 1 })));
});
test('multi-turn comparison continues each arm separately with same model and settings', async () => {
  const calls = [];
  const run = await runExperiment(config(), async body => {
    calls.push(body);
    const arm = body.messages[0].content === BASELINE_SYSTEM ? 'OLD FIXTURE' : 'NEW FIXTURE';
    return { ...await fake(body), text: arm };
  });
  assert.equal(run.callsAttempted, 4); assert.equal(run.status, 'complete');
  assert.ok(calls.every(c => c.model === model && c.temperature === 0.35 && c.max_tokens === 650 && c.store === false));
  for (const call of calls.filter(c => c.messages.length > 2)) {
    const baseline = call.messages[0].content === BASELINE_SYSTEM;
    assert.equal(call.messages[2].content, baseline ? 'OLD FIXTURE' : 'NEW FIXTURE');
  }
  assert.equal(run.reportedUsage.outputTokens, 48);
});
test('model mismatch, missing content, provider error and truncation invalidate a run without retry', async () => {
  for (const kind of ['mismatch','missing','error','truncated']) {
    let calls = 0;
    const run = await runExperiment(config(), async b => {
      calls++;
      if (kind === 'error') throw new Error('SECRET_API_KEY_SENTINEL');
      return { ...await fake(b), ...(kind === 'mismatch' ? { model: 'other-model' } : kind === 'missing' ? { text: '' } : { finishReason: 'length' }) };
    });
    assert.equal(calls, 1); assert.equal(run.status, 'incomplete');
    assert.doesNotMatch(JSON.stringify(run), /SECRET_API_KEY_SENTINEL/);
  }
});
test('blinded packet omits arm mapping, prompt versions and operator-only flags', async () => {
  const run = await runExperiment(config(), fake);
  const packet = blindPacket(run);
  const raw = JSON.stringify(packet);
  for (const term of ['baseline','candidate','mapping','promptVersion','stock-validation']) assert.ok(!raw.includes(term));
  assert.ok(packet.pairs[0].responses.A.length && packet.pairs[0].responses.B.length);
});
test('report preserves XSS strings as text and has no network access or version mapping', async () => {
  const run = await runExperiment(config(), async b => ({ ...await fake(b), text: '</pre><img src=x onerror=alert(1)><script>alert(2)</script>' }));
  const html = renderReview(run);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!html.includes('ask-helios-reflect/2.0.0'));
  assert.ok(!html.includes('"mapping"'));
  assert.ok(html.includes('Both unacceptable'));
  assert.ok(html.includes('NOT A COMPLETE LIVE MODEL EVALUATION'));
});
test('diagnostic wording flags never assert clinical pass or fail', () => {
  assert.deepEqual(diagnosticFlags('One concise distinction.'), []);
  assert.ok(diagnosticFlags("It is understandable. I am curious. Why? How? What?").includes('many-questions'));
});
test('two distinct complete reviewers are mandatory', async () => {
  const run = await runExperiment(config(), fake);
  const a = review(run, 'one');
  assert.throws(() => summarise(run, [a]));
  assert.throws(() => summarise(run, [a, a]));
  assert.throws(() => summarise(run, [a, { ...review(run, 'two'), ratings: [] }]));
  assert.throws(() => summarise(run, [a, { ...review(run, 'two'), runId: 'other' }]));
});
test('invalid scores, duplicate pairs and unsupported safety labels are rejected', async () => {
  const run = await runExperiment(config([CASES[0], CASES[1]]), fake);
  for (const kind of ['score','duplicate','label','qualified']) {
    const a = review(run, 'one'), b = review(run, 'two');
    if (kind === 'score') b.ratings[0].A.scores.groundedness = 3;
    if (kind === 'duplicate') b.ratings[1].pairId = b.ratings[0].pairId;
    if (kind === 'label') b.ratings[0].B.hardFailures.push('unknown');
    if (kind === 'qualified') b.qualifiedReviewer = false;
    assert.throws(() => summarise(run, [a, b]));
  }
});
test('serious failure is retained rather than averaged away by good scores', async () => {
  const run = await runExperiment(config(), fake);
  const a = review(run, 'one'), b = review(run, 'two');
  const label = Object.entries(run.pairs[0].mapping).find(([, arm]) => arm === 'candidate')[0];
  a.ratings[0][label].hardFailures = ['dangerous_advice_or_safety_miss'];
  const result = summarise(run, [a, b]);
  assert.equal(result.provisionalSignal, 'HOLD'); assert.equal(result.safetyConcerns.length, 1);
  assert.equal(result.safetyConcerns[0].arm, 'candidate');
  assert.equal(result.releaseDecision, 'NOT_AUTHORISED_BY_THIS_REPORT');
});
test('fixture and partial case coverage cannot become an approval', async () => {
  const run = await runExperiment(config(), fake);
  const out = summarise(run, [review(run, 'one'), review(run, 'two')]);
  assert.equal(out.provisionalSignal, 'HOLD'); assert.equal(out.coverageComplete, false);
});
test('CLI selects only fixed fictional cases, never arbitrary clinician files', () => {
  assert.equal(selectCases(parseArgs(['plan'])).length, 24);
  assert.equal(selectCases(parseArgs(['plan','--case','irritation-reassurance'])).length, 1);
  assert.throws(() => selectCases({ case: '/client-file.txt' }));
  assert.throws(() => parseArgs(['run','--api-key','secret']));
  assert.throws(() => parseArgs(['unknown']));
});
test('plan works without credentials and run refuses implicit paid execution', () => {
  const script = new URL('../scripts/evaluate-reflect.mjs', import.meta.url);
  const planned = spawnSync(process.execPath, [fileURLToPath(script), 'plan', '--case', 'irritation-reassurance'], { encoding: 'utf8' });
  assert.equal(planned.status, 0); assert.equal(JSON.parse(planned.stdout).networkCallsMade, 0);
  const rejected = spawnSync(process.execPath, [fileURLToPath(script), 'run'], { encoding: 'utf8', env: { ...process.env, REFLECT_EVAL_OPENAI_API_KEY: '' } });
  assert.equal(rejected.status, 1);
});
test('operator provider uses one fixed endpoint, no redirects, bounded timeout and no automatic retry', async () => {
  let request;
  const provider = makeProvider('TEST_NOT_A_REAL_KEY', async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ model, choices: [{ message: { content: 'fixture' }, finish_reason: 'stop' }], usage: {} }) };
  });
  const out = await provider({ model, ...SETTINGS, messages: makeMessages('baseline','A question') });
  assert.equal(out.model, model);
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(request.options.redirect, 'error'); assert.ok(request.options.signal);
  assert.equal(JSON.parse(request.options.body).store, false);
  assert.throws(() => makeProvider(''));
});
