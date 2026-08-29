import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('working documents expose deletion while finalised documents remain protected',async()=>{
  const [panel,service,migration]=await Promise.all([read('../src/components/workspace/ClientDocumentsPanel.vue'),read('../src/lib/clientDocuments.js'),read('../supabase/migrations/20260822065123_protect_finalised_document_deletion.sql')]);
  assert.match(panel,/Delete draft/);assert.match(panel,/deleteClientDocument/);assert.match(service,/\.in\('status',\['draft','review'\]\)/);assert.match(service,/Finalised documents cannot be deleted/);assert.match(migration,/status in \('draft', 'review'\)/);assert.doesNotMatch(migration,/status = 'completed'/);
});

test('Overview current focus can be entered explicitly by the therapist',async()=>{
  const focus=await read('../src/components/workspace/CurrentCareFocus.vue');
  assert.match(focus,/\+ Add aim or objective/);assert.match(focus,/kind:'current_focus'/);assert.match(focus,/origin:'clinician'/);assert.match(focus,/Save aim or objective/);
});
