import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')

test('sign-in exposes stable password-manager username and password semantics', () => {
  assert.match(authGate, /:id="mode === 'signin' \? 'account-email' : 'signup-email'"/)
  assert.match(authGate, /:name="mode === 'signin' \? 'username' : 'email'"/)
  assert.match(authGate, /:autocomplete="mode === 'signin' \? 'username' : 'email'"/)
  assert.match(authGate, /:id="mode === 'signin' \? 'account-password' : 'signup-password'"/)
  assert.match(authGate, /:name="mode === 'signin' \? 'password' : 'new-password'"/)
  assert.match(authGate, /:autocomplete="mode === 'signup' \? 'new-password' : 'current-password'"/)
})

test('signup and recovery retain new-password semantics', () => {
  assert.match(authGate, /name="new-password" required minlength="8" autocomplete="new-password"/)
  assert.match(authGate, /mode === 'signin' \? 'username' : 'email'/)
  assert.match(authGate, /mode === 'signin' \? 'password' : 'new-password'/)
})

test('email fields disable accidental text transformations', () => {
  assert.match(authGate, /inputmode="email"/)
  assert.match(authGate, /autocapitalize="none"/)
  assert.match(authGate, /spellcheck="false"/)
})
