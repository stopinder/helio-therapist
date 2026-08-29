import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');

test('surfaces the saved triage request without implying automatic generation', () => {
  assert.match(source, /Quick clinical summary/);
  assert.match(source, /clinical_summary: 'Clinical summary requested'/);
  assert.match(source, /draft_note: 'Draft clinical note requested'/);
  assert.match(source, /cbt: 'CBT reflection requested'/);
  assert.match(source, /Helio will prepare an editable draft from this transcript only after you choose this action/);
});

test('keeps the request separate from Clinical Record approval', () => {
  assert.match(source, /Review and save remain separate steps/);
  assert.match(source, /is not an approved Clinical Record/i);
});
