import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')

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
  assert.match(sidebar, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(sidebar, /shrink-0 border-b border-border-muted bg-sidebar/)
  assert.match(sidebar, /flex min-h-touch w-full items-center/)
  assert.match(sidebar, /:aria-expanded="accountMenuOpen"/)
  assert.match(sidebar, /aria-haspopup="menu"/)
  assert.match(sidebar, /Settings/)
  assert.match(sidebar, /Sign out/)
})

test('desktop and mobile sidebars receive the same account identity', () => {
  const sidebarInvocations = shell.match(/<AppSidebar/g) || []
  assert.ok(sidebarInvocations.length >= 2, 'Should have at least 2 AppSidebar instances (desktop/mobile)')
  
  const identityProps = shell.match(/:account-identity="accountIdentity"/g) || []
  assert.ok(identityProps.length >= 2, 'Should pass accountIdentity prop to both instances')
})
