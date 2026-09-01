import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('ClientDocumentsPanel implements the refined hierarchy and archived boundaries', async () => {
  const panel = await read('../src/components/workspace/ClientDocumentsPanel.vue');

  assert.match(panel, /Letters, reports and client-facing documents created for this client\./);
  assert.match(panel, /Create a client session summary, letter, report or clinical summary when you need one\./);

  assert.match(panel, /visibleDocuments=computed\(\(\)=>props\.documents\.filter\(document=>!deletedIds\.value\.has\(document\.id\)\)\)/);
  assert.match(panel, /draftDocuments=computed\(\(\)=>visibleDocuments\.value\.filter\(document=>document\.status!==['"]completed['"]\)\)/);
  assert.match(panel, /finalisedDocuments=computed\(\(\)=>visibleDocuments\.value\.filter\(document=>document\.status===['"]completed['"]\)\)/);

  assert.match(panel, /Drafts/);
  assert.match(panel, /Editable working documents/);
  assert.match(panel, /Finalised/);
  assert.match(panel, /Read-only documents saved for this client\./);

  assert.match(panel, /Continue editing/);
  assert.match(panel, /Delete draft/);
  assert.match(panel, /removeDraft\(document\)/);
  assert.match(panel, /Download/);
  assert.match(panel, /v-if="document\.storagePath"/);

  assert.match(panel, /v-if="!archived"/);
  assert.match(panel, /if\(props\.archived\|\|document\.status===['"]completed['"]\)return/);
});

test('ClientWorkspace provides the correct archived state to Documents panel', async () => {
  const workspace = await read('../src/views/ClientWorkspace.vue');
  assert.match(workspace, /<ClientDocumentsPanel v-else-if="activeTab === 'Documents'"[^>]*:archived="client\.archived"/);
  assert.match(workspace, /function newDocument\(documentType='other'\)\{if\(client\.value\?\.archived\)return/);
  assert.match(workspace, /function editDocument\(document\)\{if\(client\.value\?\.archived\)return/);
});
