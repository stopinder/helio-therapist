import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('multi-record resource and completion workflows call database transactions', async () => {
  const resources = await readFile(new URL('../api/resources.js', import.meta.url), 'utf8')
  const requests = await readFile(new URL('../api/resource-assignments.js', import.meta.url), 'utf8')
  const completion = await readFile(new URL('../api/client-completion.js', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20260726113823_sprint_one_hardening.sql', import.meta.url), 'utf8')

  assert.match(resources, /rpc\('create_resource_with_version'/)
  assert.match(requests, /rpc\('create_client_request_with_items'/)
  assert.match(completion, /rpc\('submit_client_completion'/)
  assert.match(migration, /create or replace function public\.create_resource_with_version/)
  assert.match(migration, /create or replace function public\.create_client_request_with_items/)
  assert.match(migration, /create or replace function public\.submit_client_completion/)
})

test('privileged transactional functions are not executable by browser roles', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260726113823_sprint_one_hardening.sql', import.meta.url), 'utf8')

  assert.match(migration, /revoke all on function public\.create_resource_with_version[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /revoke all on function public\.create_client_request_with_items[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /revoke all on function public\.submit_client_completion[\s\S]*from public, anon, authenticated/)
})

test('tenant policies validate the owner of referenced clinical records', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260726113823_sprint_one_hardening.sql', import.meta.url), 'utf8')

  assert.match(migration, /resource\.id = resource_versions\.resource_id[\s\S]*resource\.user_id = \(select auth\.uid\(\)\)/)
  assert.match(migration, /request\.id = client_request_items\.client_request_id[\s\S]*request\.client_id = client_request_items\.client_id/)
  assert.match(migration, /assignment\.id = outcome_measure_results\.assignment_id[\s\S]*assignment\.client_id = outcome_measure_results\.client_id/)
  assert.match(migration, /response\.assignment_id = assignment\.id/)
})
