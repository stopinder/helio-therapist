import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const endpoint = await readFile(new URL('../api/marketing/subscribe.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260826115000_add_marketing_leads.sql', import.meta.url), 'utf8')

test('public marketing subscription requires explicit consent and a valid email', () => {
  assert.match(endpoint, /marketingConsent === true/)
  assert.match(endpoint, /Marketing consent is required/)
  assert.match(endpoint, /EMAIL_PATTERN\.test\(email\)/)
})

test('visitor marketing leads are isolated from clinical and authenticated profile data', () => {
  assert.match(migration, /create table if not exists public\.marketing_leads/)
  assert.match(migration, /email text not null/)
  assert.match(migration, /consented_at timestamptz not null/)
  assert.match(migration, /source text not null/)
  assert.match(migration, /enable row level security/)
  assert.doesNotMatch(migration, /client_id|session_id|transcript|clinical_record/i)
})

test('subscription endpoint writes only through the server service client and syncs consented contacts', () => {
  assert.match(endpoint, /getSupabaseClient\(\)/)
  assert.match(endpoint, /\.from\('marketing_leads'\)/)
  assert.match(endpoint, /syncResendContact\(email\)/)
  assert.doesNotMatch(endpoint, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/)
})
