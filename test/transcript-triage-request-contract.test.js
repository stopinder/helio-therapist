import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');

test('requires speaker confirmation before therapist-triggered session capture', () => {
  assert.match(source, /Confirm speaker identities/);
  assert.match(source, /Confirm speakers/);
  assert.match(source, /v-if="speakersConfirmed"/);
  assert.match(source, /Prepare session capture/);
});

test('keeps the request separate from Clinical Record approval', () => {
  assert.match(source, /Editable working material · not saved/);
  assert.match(source, /Notes, Reflection and Clinical Record remain separate steps/);
  assert.match(source, /is not an approved Clinical Record/i);
});
