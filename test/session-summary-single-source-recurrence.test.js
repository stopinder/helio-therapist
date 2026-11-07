import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shared = await readFile(new URL('../api/_lib/ai-client-session-summary.js', import.meta.url), 'utf8')
const direct = await readFile(new URL('../api/ai/session-summary.js', import.meta.url), 'utf8')

test('single-session reported history cannot be labelled cross-session recurrence',async()=>{
const prompt=clientSessionSummarySystemPrompt('general');
 assert.match(prompt,/Use current_observation for a single session, including its report of earlier repeated events/);
 assert.match(prompt,/recurring claim must cite two or more independent supplied session IDs/);
 assert.match(direct,/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/);
});

test('validator repairs only the safe one-session recurring metadata case', () => {
  assert.match(shared, /sessionSourceCount===1/)
  assert.match(shared, /evidenceStrength='current_observation'/)
  assert.match(shared, /recurring requires session evidence/)
})
