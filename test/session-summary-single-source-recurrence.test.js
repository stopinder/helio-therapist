import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shared = await readFile(new URL('../api/_lib/ai-client-session-summary.js', import.meta.url), 'utf8')
const direct = await readFile(new URL('../api/ai/session-summary.js', import.meta.url), 'utf8')

test('single-session reported history cannot be labelled cross-session recurrence', () => {
  assert.match(shared, /one supplied session itself reports that something has happened repeatedly over time/)
  assert.match(shared, /evidenceStrength must remain current_observation/)
  assert.match(direct, /use evidenceStrength=current_observation, never recurring/)
  assert.match(direct, /Use recurring only when at least two supplied session IDs support the claim/)
})

test('validator repairs only the safe one-session recurring metadata case', () => {
  assert.match(shared, /sessionSourceCount===1/)
  assert.match(shared, /evidenceStrength='current_observation'/)
  assert.match(shared, /recurring requires session evidence/)
})
