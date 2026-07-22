import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('client request model keeps one send action and independently managed items', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260722100000_add_client_requests_and_request_items.sql', import.meta.url), 'utf8')
  const refinement = await readFile(new URL('../supabase/migrations/20260722113000_refine_client_request_catalogue.sql', import.meta.url), 'utf8')
  const endpoint = await readFile(new URL('../api/resource-assignments.js', import.meta.url), 'utf8')

  assert.match(migration, /create table if not exists public\.client_requests/)
  assert.match(migration, /rename to client_request_items/)
  assert.match(migration, /client_request_item_id uuid/)
  assert.match(endpoint, /resourceVersionIds/)
  assert.match(endpoint, /from\('client_requests'\)\.insert/)
  assert.match(endpoint, /from\('client_request_items'\)\.insert/)
  assert.match(endpoint, /Therapist-only resources cannot be sent to a client/)
  assert.match(endpoint, /idempotencyKey/)
  assert.match(refinement, /complete_in_helio/)
  assert.match(refinement, /complete_or_upload/)
  assert.match(refinement, /audience text not null default 'client'/)
})
