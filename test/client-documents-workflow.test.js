import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('client document schema is additive, client-scoped and draft-capable', async () => {
  const migration = await read('../supabase/migrations/20260809170000_harden_client_documents.sql');
  assert.match(migration, /add column if not exists client_id uuid references public\.clients\(id\)/);
  assert.match(migration, /content jsonb/);
  assert.match(migration, /source_manifest jsonb/);
  assert.match(migration, /version integer/);
  assert.match(migration, /alter column storage_path drop not null/);
  assert.match(migration, /documents_user_client_created_idx/);
  assert.match(migration, /c\.user_id = auth\.uid\(\)/);
});

test('document service only offers completed clinical sessions as sources', async () => {
  const service = await read('../src/lib/clientDocuments.js');
  assert.match(service, /from\('sessions'\)/);
  assert.match(service, /\.eq\('client_id', clientId\)/);
  assert.match(service, /\.eq\('status', 'completed'\)/);
  assert.match(service, /notes,notes_status,version/);
  assert.doesNotMatch(service, /private_reflections/);
  assert.doesNotMatch(service, /included_in_supervision/);
  assert.match(service, /DOCUMENT_CONFLICT/);
  assert.match(service, /\.eq\('version', document\.version\)/);
});

test('Client Workspace exposes a real document composer and library', async () => {
  const header = await read('../src/components/workspace/ClientWorkspaceHeader.vue');
  const composer = await read('../src/components/workspace/ClientDocumentComposer.vue');
  const panel = await read('../src/components/workspace/ClientDocumentsPanel.vue');
  const workspace = await read('../src/views/ClientWorkspace.vue');
  assert.match(header, /data-testid="create-client-document"/);
  assert.match(header, /ClientDocumentComposer/);
  assert.match(composer, /data-testid="client-document-composer"/);
  assert.match(composer, /Only completed clinical session notes/);
  assert.match(composer, /Private reflections and supervision material are not available here/);
  assert.match(composer, /Save Draft/);
  assert.match(panel, /data-testid="client-documents-panel"/);
  assert.match(panel, /Edit Draft/);
  assert.match(workspace, /activeTab === 'Documents'/);
  assert.match(workspace, /listClientDocuments/);
  assert.match(workspace, /downloadClientDocument/);
});
