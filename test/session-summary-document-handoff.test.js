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

test('saving a summary preserves provenance when unchanged and replaces stale sources on regeneration', async () => {
  const service = await read('../src/lib/clientDocuments.js');

  assert.match(service, /changes\.sourceManifest===undefined\?document\.sourceManifest/);
  assert.match(service, /Array\.isArray\(changes\.sourceManifest\)/);
  assert.match(service, /source_manifest:mergeSourceManifest\(document,changes\)/);
});
