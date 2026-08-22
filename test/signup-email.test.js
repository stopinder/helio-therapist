import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../api/signup/welcome.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260822122932_add_marketing_email_consent.sql', import.meta.url), 'utf8')

test('signup marketing consent is explicit and optional', () => {
  assert.match(authGate, /marketingEmailConsent = ref\(false\)/)
  assert.match(authGate, /Send me occasional Helios product updates/)
  assert.match(authGate, /marketing_email_consent: marketingEmailConsent\.value/)
})

test('signup guidance survives the redirect to sign in', () => {
  const redirectIndex = authGate.indexOf("await router.replace('/sign-in')", authGate.indexOf("if (!data.session)"))
  const messageIndex = authGate.indexOf('If this email can be used to create an account', redirectIndex)
  assert.ok(redirectIndex >= 0)
  assert.ok(messageIndex > redirectIndex)
  assert.match(authGate, /use your existing password or reset it below/)
})

test('sign in failure gives useful generic guidance without revealing account existence', () => {
  assert.match(authGate, /Email or password is incorrect/)
  assert.match(authGate, /confirm your email before signing in/)
  assert.doesNotMatch(authGate, /No account exists for this email/)
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
