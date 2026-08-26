import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')

test('sidebar account identity is dynamic and therapist-owned', () => {
  assert.match(shell, /supabase\.auth\.getUser\(\)/)
  assert.match(shell, /from\('profiles'\)/)
  assert.match(shell, /select\('full_name,role,professional_title'\)/)
  assert.match(shell, /\.eq\('id',user\.id\)/)
  assert.match(shell, /user\.user_metadata\?\.full_name/)
  assert.match(shell, /user\.email/)
  assert.doesNotMatch(shell, /'Robert Ormiston'/)
  assert.doesNotMatch(shell, /'Psychotherapist'/)
  assert.doesNotMatch(shell, /'RO'/)
})

test('navigation scrolls independently from the account controls', () => {
  assert.match(shell, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /aria-haspopup="menu"/)
  assert.match(shell, /:aria-expanded="accountMenuOpen"/)
  assert.match(shell, /Settings/)
  assert.match(shell, /Sign out/)
})

test('desktop and mobile sidebars expose the same account identity control', () => {
  const nameBindings = shell.match(/\{\{ accountIdentity\.name \}\}/g) || []
  const menuTriggers = shell.match(/aria-haspopup="menu"/g) || []
  assert.equal(nameBindings.length, 2)
  assert.equal(menuTriggers.length, 2)
})
