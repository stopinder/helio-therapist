import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const clients = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260811172000_client_archive_lifecycle.sql', import.meta.url), 'utf8')
const guardMigration = await readFile(new URL('../supabase/migrations/20260811181000_enforce_active_client_for_new_work.sql', import.meta.url), 'utf8')

test('client archive is reversible and records an archive timestamp', () => {
  assert.match(clients, /export async function setClientArchived/)
  assert.match(clients, /archived_at: archived \? now : null/)
  assert.match(clients, /\.eq\('user_id', user\.id\)/)
  assert.match(migration, /add column if not exists archived_at timestamptz/)
  assert.match(migration, /Archiving retains the client record/)
})

test('workspace makes archive meaning explicit and never exposes deletion', () => {
  assert.match(header, /Archive client/)
  assert.match(header, /Restore client/)
  assert.match(header, /Their records will be retained and the client can be restored later/)
  assert.match(workspace, /Historical records remain available/)
  assert.doesNotMatch(header, /Delete client/)
  assert.doesNotMatch(clients, /\.delete\(\)/)
})

test('archived clients cannot receive new active work', () => {
  assert.match(header, /!isSessionWorkspace && !client\.archived/)
  assert.match(header, /if \(props\.client\.archived \|\| openingSession\.value\) return/)
  assert.match(workspace, /Restore the client before starting a new session, joining a meeting, or scheduling a new appointment/)
  assert.match(guardMigration, /before insert on public\.sessions/)
  assert.match(guardMigration, /before insert on public\.appointments/)
  assert.match(guardMigration, /c\.archived = true/)
})
