import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('client session summary reuses Client Documents without importing internal clinical material', async () => {
  const workspace = await read('../src/views/ClientWorkspace.vue');
  const panel = await read('../src/components/workspace/ClientDocumentsPanel.vue');
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  const pdf = await read('../api/_lib/documentPdf.js');

  assert.match(panel, /Create session summary/i);
  assert.match(workspace, /session_summary/);
  assert.match(composer, /session_summary/);
  assert.match(composer, /What we discussed/);
  assert.match(composer, /Key understanding or themes/);
  assert.match(composer, /Agreed actions or practice/);
  assert.match(composer, /What to carry forward/);
  assert.match(composer, /internal clinical notes are not included automatically/i);
  assert.match(composer, /isSessionSummary/);
  assert.match(composer, /v-if="!isSessionSummary"[^>]*>Add from clinical notes/);
  assert.match(composer, /sourcePanelOpen\.value=false/);
  assert.match(composer, /selectedSourceIds\.value=\[\]/);
  assert.match(composer, /addedSourceIds\.value=\[\]/);
  assert.match(composer, /Finalise PDF/);
  assert.match(composer, /finaliseClientDocument/);
  assert.match(pdf, /SESSION SUMMARY/);
  assert.match(pdf, /Session summary/);
  assert.doesNotMatch(pdf, /session_summary.*Confidential clinical document/);
});
