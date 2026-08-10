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

test('navigation scrolls independently above a compact account footer', () => {
  assert.match(shell, /flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /shrink-0 border-t border-border-muted px-3 py-2 bg-sidebar/)
  assert.match(shell, /h-7 w-7 rounded-pill/)
  assert.match(shell, /py-1\.5/)
  assert.match(shell, /Settings/)
  assert.match(shell, /Sign out/)
})

test('desktop and mobile sidebars receive the same account identity', () => {
  const matches = shell.match(/<SidebarAccount :account="accountIdentity"/g) || []
  assert.equal(matches.length, 2)
})
