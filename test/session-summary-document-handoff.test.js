import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('session summary links to its exact client document and finalised summaries are read-only', async () => {
  const source = await read('../src/views/SessionWorkspace.vue');

  assert.match(source, /Open in Client Documents/);
  assert.match(source, /query: \{ document: summaryDocument\.id \}/);
  assert.match(source, /summaryDocument\.status !== 'completed'/);
  assert.match(source, /summaryDocument\.value\?\.status === 'completed'/);
});

test('client workspace opens the document requested by the session summary handoff', async () => {
  const [workspace, panel] = await Promise.all([
    read('../src/views/ClientWorkspace.vue'),
    read('../src/components/workspace/ClientDocumentsPanel.vue')
  ]);

  assert.match(workspace, /focusDocumentId=computed/);
  assert.match(workspace, /openRequestedDocument/);
  assert.match(workspace, /documents\.value\.find\(document=>document\.id===documentId\)/);
  assert.match(workspace, /documentComposerOpen\.value=true/);
  assert.match(panel, /focusDocumentId/);
  assert.match(panel, /section-documents/);
});

test('saving a session summary document preserves its existing session linkage', async () => {
  const service = await read('../src/lib/clientDocuments.js');

  assert.match(service, /if\(!source\?\.sessionId\)continue/);
  assert.match(service, /candidate\?\.sessionId===source\.sessionId/);
  assert.match(service, /source_manifest:mergeSourceManifest\(document,changes\)/);
});
