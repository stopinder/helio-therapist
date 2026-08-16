import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');

test('surfaces the saved triage request without implying automatic generation', () => {
  assert.match(source, /Transcript triage request/);
  assert.match(source, /clinical_summary: 'Clinical summary requested'/);
  assert.match(source, /draft_note: 'Draft clinical note requested'/);
  assert.match(source, /cbt: 'CBT reflection requested'/);
  assert.match(source, /Nothing has been generated automatically/);
});

test('keeps the request separate from Clinical Record approval', () => {
  assert.match(source, /this request does not create or approve a Clinical Record/);
  assert.doesNotMatch(source, /Generate requested output/);
});
