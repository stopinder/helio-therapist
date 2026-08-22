import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../api/signup/welcome.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260822142000_add_marketing_email_consent.sql', import.meta.url), 'utf8')

test('signup marketing consent is explicit and optional', () => {
  assert.match(authGate, /marketingEmailConsent = ref\(false\)/)
  assert.match(authGate, /Send me occasional Helios product updates/)
  assert.match(authGate, /marketing_email_consent: marketingEmailConsent\.value/)
})

test('welcome endpoint verifies the Supabase user before sending', () => {
  assert.match(endpoint, /auth\.admin\.getUserById\(userId\)/)
  assert.match(endpoint, /data\.user\.email\?\.toLowerCase\(\) !== email/)
  assert.match(endpoint, /Date\.now\(\) - createdAt > 10 \* 60 \* 1000/)
  assert.match(endpoint, /Idempotency-Key/)
})

test('Resend receives only account identity and marketing subscription state', () => {
  assert.match(endpoint, /first_name/)
  assert.match(endpoint, /last_name/)
  assert.match(endpoint, /unsubscribed: !subscribed/)
  for (const clinicalTerm of ['client_name', 'session_id', 'transcript', 'diagnosis', 'clinical_record']) {
    assert.doesNotMatch(endpoint, new RegExp(clinicalTerm))
  }
})

test('marketing consent is stored on the existing therapist profile', () => {
  assert.match(migration, /add column if not exists marketing_email_consent_at timestamptz/)
  assert.match(migration, /new\.raw_user_meta_data ->> 'marketing_email_consent'/)
  assert.match(migration, /insert into public\.profiles \(id, full_name, marketing_email_consent_at\)/)
})
