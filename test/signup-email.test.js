import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { heliosWelcomeEmail } from '../api/_lib/emails/heliosWelcomeEmail.js'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../api/signup/welcome.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260822122932_add_marketing_email_consent.sql', import.meta.url), 'utf8')
const resourceExchangeMigration = await readFile(new URL('../supabase/migrations/20260721120000_add_clinical_resource_exchange_architecture.sql', import.meta.url), 'utf8')

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

test('welcome endpoint derives identity from an authenticated session', () => {
  assert.match(endpoint, /requireAuthenticatedUser\(req\)/)
  assert.match(endpoint, /const email = String\(user\.email/)
  assert.doesNotMatch(endpoint, /req\.body\?\.userId/)
  assert.doesNotMatch(endpoint, /req\.body\?\.email/)
  assert.doesNotMatch(endpoint, /auth\.admin\.getUserById/)
  assert.match(endpoint, /Date\.now\(\) - createdAt > WELCOME_WINDOW_MS/)
  assert.match(endpoint, /Idempotency-Key/)
})

test('welcome endpoint uses the dedicated branded template', () => {
  assert.match(endpoint, /heliosWelcomeEmail/)
  assert.match(endpoint, /const \{ subject, html, text \} = heliosWelcomeEmail\(\{ firstName \}\)/)
})

test('welcome template contains branded HTML, CTA and plain-text fallback', () => {
  const email = heliosWelcomeEmail({ firstName: '<Robert>', openHeliosUrl: 'https://helio.works/overview?x=1&y=2' })
  assert.equal(email.subject, 'Welcome to Helios')
  assert.match(email.html, /CLINICAL WORKSPACE/)
  assert.match(email.html, /Open Helios/)
  assert.match(email.html, /&lt;Robert&gt;/)
  assert.match(email.html, /https:\/\/helio\.works\/overview\?x=1&amp;y=2/)
  assert.match(email.text, /Welcome to Helios, <Robert>/)
  assert.match(email.text, /Open Helios:/)
})

test('frontend sends only the authenticated access token to the welcome endpoint', () => {
  assert.match(authGate, /Authorization: `Bearer \$\{accessToken\}`/)
  assert.doesNotMatch(authGate, /JSON\.stringify\(\{ userId: user\.id, email: user\.email \}\)/)
  assert.match(authGate, /if \(data\.session\?\.access_token\) await notifySignup\(data\.session\.access_token\)/)
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

test('client response storage remains private and server-mediated', () => {
  assert.match(resourceExchangeMigration, /values \('client-resource-responses', 'client-resource-responses', false, 10485760\)/)
  assert.match(resourceExchangeMigration, /Keep client returns private\. No client-facing policy is intentionally created here\./)
  assert.doesNotMatch(resourceExchangeMigration, /create policy[^;]*client-resource-responses/is)
})
