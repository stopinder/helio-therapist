import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('ClientWorkspace passes client email to ClientDocumentComposer', async () => {
  const source = await read('../src/views/ClientWorkspace.vue');
  assert.match(source, /<ClientDocumentComposer/);
  // This will fail initially as it's not yet implemented
  assert.match(source, /:client-email="client\?\.email/);
});

test('ClientDocumentComposer supports Prepare email handoff for finalised session summaries', async () => {
  const source = await read('../src/components/workspace/ClientDocumentComposer.vue');
  
  // Props
  assert.match(source, /clientEmail:\s*\{\s*type:\s*String/);
  
  // Button availability logic (should be constrained to session_summary and finalised)
  assert.match(source, /isSessionSummary && clientEmail/);
  assert.match(source, /v-if="finalised"/);
  assert.match(source, /Prepare email/);
  
  // Neutral subject and body
  assert.match(source, /encodeURIComponent\('Session Summary'\)/);
  assert.match(source, /find your session summary attached/);
  
  // Manual attachment instruction
  assert.match(source, /Attach the downloaded PDF before sending/);
  
  // No clinical record coupling (negative check)
  assert.doesNotMatch(source, /Clinical Record.*mailto/);
});
