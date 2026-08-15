import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('ClientDocumentsPanel implements the refined hierarchy and archived boundaries', async () => {
  const panel = await read('../src/components/workspace/ClientDocumentsPanel.vue');

  // Therapist-facing description
  assert.match(panel, /Letters, reports and clinical documents created for this client\./);
  assert.match(panel, /Create a letter, report or clinical summary when you need one\./);

  // Grouping logic
  assert.match(panel, /const draftDocuments = computed\(\(\) => props\.documents\.filter\(document => document\.status !== 'completed'\)\)/);
  assert.match(panel, /const finalisedDocuments = computed\(\(\) => props\.documents\.filter\(document => document\.status === 'completed'\)\)/);

  // Section headings and descriptions
  assert.match(panel, /<h4 id="draft-documents-heading" class="text-body font-semibold text-ink">Drafts<\/h4>/);
  assert.match(panel, /Editable working documents\./);
  assert.match(panel, /<h4 id="finalised-documents-heading" class="text-body font-semibold text-ink">Finalised<\/h4>/);
  assert.match(panel, /Read-only documents saved for this client\./);

  // Actions
  assert.match(panel, /Continue editing/);
  assert.match(panel, /Download/);
  assert.match(panel, /v-if="document\.storagePath"/);

  // Archived boundaries
  // 1. Create Document hidden for archived
  assert.match(panel, /v-if="!archived" type="button" class="button-primary" @click="\$emit\('create'\)">Create Document/);
  
  // 2. Draft editing hidden for archived
  assert.match(panel, /v-if="!archived" type="button" class="button-secondary shrink-0" @click="\$emit\('edit', document\)">Continue editing/);

  // 3. Finalised downloads remain available for archived (button is NOT wrapped in !archived)
  // We check that the download button exists and doesn't have !archived in its immediate v-if
  assert.match(panel, /<button v-if="document\.storagePath" type="button" class="button-secondary shrink-0" @click="\$emit\('download', document\)">Download<\/button>/);
});

test('ClientWorkspace provides the correct archived state to Documents panel', async () => {
  const workspace = await read('../src/views/ClientWorkspace.vue');
  assert.match(workspace, /<ClientDocumentsPanel v-else-if="activeTab === 'Documents'" :documents="documents" :loading="documentsLoading" :error="documentsError" :archived="client\.archived" @create="newDocument" @edit="editDocument" @download="downloadDocument" \/>/);
  
  // Verify newDocument and editDocument guard against archived
  assert.match(workspace, /function newDocument\(\)\{if\(client\.value\?\.archived\)return;editingDocument\.value=null;documentComposerOpen\.value=true\}/);
  assert.match(workspace, /function editDocument\(document\)\{if\(client\.value\?\.archived\)return;editingDocument\.value=document;documentComposerOpen\.value=true\}/);
});
