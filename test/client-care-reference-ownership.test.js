import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20260817095700_harden_client_care_reference_ownership.sql', import.meta.url),
  'utf8'
);

test('Care RLS requires the referenced client to belong to the authenticated therapist', () => {
  assert.match(migration, /therapist_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /clients\.id = client_care_items\.client_id/);
  assert.match(migration, /clients\.user_id = \(select auth\.uid\(\)\)/);
});

test('Care provenance session must belong to the same therapist and client', () => {
  assert.match(migration, /provenance_session_id is null/);
  assert.match(migration, /sessions\.id = client_care_items\.provenance_session_id/);
  assert.match(migration, /sessions\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /sessions\.client_id = client_care_items\.client_id/);
});
