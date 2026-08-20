import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const settings = await readFile(new URL('../src/components/Settings.vue', import.meta.url), 'utf8')
const overview = await readFile(new URL('../src/views/Overview.vue', import.meta.url), 'utf8')
const clientDetails = await readFile(new URL('../src/views/ClientDetails.vue', import.meta.url), 'utf8')
const clients = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')

test('signup confirmation is truthful without confirming account existence', () => {
  assert.match(authGate, /If this email can be used to create an account/)
  assert.doesNotMatch(authGate, /Account created\. Check your email/)
})

test('settings edits the existing therapist-owned practice profile', () => {
  assert.match(settings, /Professional profile/)
  assert.match(settings, /full_name,professional_title,practice_name,document_email,document_phone,practice_website,practice_address/)
  assert.match(settings, /supabase\.auth\.getUser\(\)/)
  assert.match(settings, /from\('profiles'\)\.upsert/)
  assert.match(settings, /onConflict:'id'/)
})

test('empty overview gives a clear first action without creating new product scope', () => {
  assert.match(overview, /clients\.value\.length === 0 && sessions\.value\.length === 0/)
  assert.match(overview, /Add your first client to begin using your practice workspace/)
  assert.match(overview, /Go to clients/)
  assert.match(overview, /Complete practice details/)
})

test('existing client profile fields are editable and persisted', () => {
  assert.doesNotMatch(clientDetails, /read-only mode until the database migration/)
  assert.doesNotMatch(clientDetails, /disabled\s*\/>/)
  for (const field of ['preferred_name', 'date_of_birth', 'phone', 'email', 'address', 'gp_details', 'emergency_contact', 'notes']) {
    assert.match(clients, new RegExp(`${field}: updates\\.${field}`))
  }
})

test('new client email is stored only as email, not as the client reference', () => {
  assert.match(clients, /reference: null/)
  assert.match(clients, /email: email \|\| null/)
  assert.doesNotMatch(clients, /reference: email \|\| null/)
})
