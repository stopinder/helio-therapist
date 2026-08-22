import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL('../supabase/migrations/20260822213000_index_documents_client_foreign_key.sql', import.meta.url),
  'utf8'
)

test('documents client foreign key receives a direct covering index', () => {
  assert.match(migration, /create index if not exists documents_client_id_idx/i)
  assert.match(migration, /on public\.documents \(client_id\)/i)
})

test('final remediation stays additive and does not broaden document access', () => {
  assert.doesNotMatch(migration, /drop\s+(index|table|column)/i)
  assert.doesNotMatch(migration, /alter\s+policy|create\s+policy|grant\s+/i)
  assert.doesNotMatch(migration, /security\s+definer/i)
})
