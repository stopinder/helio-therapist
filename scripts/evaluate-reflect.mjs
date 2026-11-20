#!/usr/bin/env node
// Operator-only synthetic benchmark. No web endpoint, Supabase client, .env
// loading or production quota bypass. Requires a separate evaluation API key.
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CASES } from '../experiments/reflect/cases.mjs';
import { plan, runExperiment, validateRunLimits, summarise } from '../experiments/reflect/engine.mjs';
import { renderReview } from '../experiments/reflect/report.mjs';
export function parseArgs(args) {
  const command = args[0] && !args[0].startsWith('--') ? args.shift() : 'plan';
  const options = { command, partition: 'development', repeats: 1 };
  const booleans = new Set(['live','acknowledge-api-costs']);
  const values = new Set(['case','partition','repeats','model','max-calls','max-output-tokens','out','operator','reviews']);
  while (args.length) {
    const token = args.shift();
    if (!token?.startsWith('--')) throw new Error('Expected a named option');
    const key = token.slice(2);
    if (booleans.has(key)) { options[key] = true; continue; }
    if (!values.has(key) || !args.length || args[0].startsWith('--')) throw new Error('Unknown or incomplete option: ' + key);
    options[key] = args.shift();
  }
  if (!['plan','run','summarise'].includes(command)) throw new Error('Use plan, run, or summarise');
  for (const key of ['repeats','max-calls','max-output-tokens']) if (options[key] !== undefined) options[key] = Number(options[key]);
  return options;
}
export function selectCases(options) {
  if (options.case) {
    const ids = options.case.split(',');
    if (new Set(ids).size !== ids.length || ids.some(id => !CASES.some(c => c.id === id))) throw new Error('Unknown or duplicate fixed synthetic case');
    return CASES.filter(c => ids.includes(c.id));
  }
  if (!['development','regression','reserved','all'].includes(options.partition)) throw new Error('Invalid partition');
  return CASES.filter(c => options.partition === 'all' || c.partition === options.partition);
}
export function makeProvider(apiKey, fetchImpl = globalThis.fetch) {
  if (!apiKey) throw new Error('Set REFLECT_EVAL_OPENAI_API_KEY securely in the operator environment; do not paste it into chat or arguments');
  return async body => {
    const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Provider request failed');
    const result = await response.json();
    return { text: result.choices?.[0]?.message?.content, model: result.model,
      finishReason: result.choices?.[0]?.finish_reason, usage: result.usage,
      fingerprint: result.system_fingerprint };
  };
}
async function readJson(path) {
  const text = await readFile(resolve(path), 'utf8');
  if (text.length > 20_000_000) throw new Error('Review file too large');
  return JSON.parse(text);
}
export async function main(argv, env = process.env) {
  const options = parseArgs([...argv]);
  if (options.command === 'summarise') {
    if (!options.operator || !options.reviews) throw new Error('Specify --operator and comma-separated --reviews');
    const run = await readJson(options.operator);
    const reviews = await Promise.all(options.reviews.split(',').map(readJson));
    console.log(JSON.stringify(summarise(run, reviews), null, 2));
    return;
  }
  const cases = selectCases(options);
  const config = { cases, repeats: options.repeats, model: options.model,
    maxCalls: options['max-calls'], maxOutputTokens: options['max-output-tokens'], execution: 'live' };
  if (options.command === 'plan') {
    console.log(JSON.stringify({ ...plan(config), caseIds: cases.map(c => c.id),
      networkCallsMade: 0, warning: 'Call and token ceilings are not a dollar quote. Use provider-side spending limits as well.' }, null, 2));
    return;
  }
  if (!options.live || !options['acknowledge-api-costs']) throw new Error('Live generation needs --live and --acknowledge-api-costs');
  validateRunLimits(config); // Reject oversize plans before looking for a key or creating output.
  const provider = makeProvider(env.REFLECT_EVAL_OPENAI_API_KEY);
  const directory = options.out ? resolve(options.out) : await mkdtemp(join(tmpdir(), 'helios-reflect-'));
  if (options.out) await mkdir(directory, { recursive: false, mode: 0o700 }); // Never overwrite a prior run.
  await writeFile(join(directory, '.gitignore'), '*\n', { mode: 0o600 });
  const run = await runExperiment(config, provider);
  // Never distribute operator.json to blinded reviewers: it contains the key.
  await writeFile(join(directory, 'operator.json'), JSON.stringify(run, null, 2), { mode: 0o600 });
  await writeFile(join(directory, 'review.html'), renderReview(run), { mode: 0o600 });
  console.log(JSON.stringify({ runId: run.runId, status: run.status, callsAttempted: run.callsAttempted,
    successfulCalls: run.successfulCalls, usage: run.reportedUsage, directory,
    interpretation: 'Generated responses await independent clinician review; this is not a clinical PASS.' }, null, 2));
  if (run.status !== 'complete') process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(() => {
    // Avoid serialising provider requests, authentication headers or review contents.
    console.error('Reflect evaluation stopped. Check the documented command, approved limits and operator configuration. No automatic retry.');
    process.exitCode = 1;
  });
}
