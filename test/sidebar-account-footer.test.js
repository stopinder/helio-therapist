import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')

test('sidebar account identity is dynamic and therapist-owned', () => {
  assert.match(shell, /supabase\.auth\.getUser\(\)/)
  assert.match(shell, /from\('profiles'\)/)
  assert.match(shell, /select\('full_name,role,professional_title'\)/)
  assert.match(shell, /\.eq\('id',\s*user\.id\)/)
  assert.match(shell, /user\.user_metadata\?\.full_name/)
  assert.match(shell, /user\.email/)
  assert.doesNotMatch(shell, /'Robert Ormiston'/)
  assert.doesNotMatch(shell, /'Psychotherapist'/)
  assert.doesNotMatch(shell, /'RO'/)
})

test('navigation scrolls independently beneath the compact account control', () => {
  assert.match(shell, /flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /border-b border-border-muted bg-sidebar px-3 py-2/)
  assert.match(shell, /flex min-h-touch w-full items-center/)
  assert.match(shell, /aria-expanded/)
  assert.match(shell, /aria-haspopup/)
  assert.match(shell, /Settings/)
  assert.match(shell, /Sign out/)
})

test('desktop and mobile sidebars receive the same account identity', () => {
  const nameBindings = shell.match(/\{\{\s*accountIdentity\.name\s*\}\}/g) || []
  const initialsBindings = shell.match(/\{\{\s*accountIdentity\.initials\s*\}\}/g) || []

  assert.ok(nameBindings.length >= 2, 'Should have at least 2 name bindings (desktop/mobile)')
  assert.ok(initialsBindings.length >= 2, 'Should have at least 2 initials bindings (desktop/mobile)')
})
