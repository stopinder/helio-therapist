import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')

test('sidebar practice identity is dynamic and therapist-owned', () => {
  assert.match(shell, /supabase\.auth\.getUser\(\)/)
  assert.match(shell, /from\('profiles'\)/)
  assert.match(shell, /select\('full_name,role,professional_title,practice_name(?:,[^']+)*'\)/)
  assert.match(shell, /\.eq\('id',\s*user\.id\)/)
  assert.match(shell, /practiceName:\s*profile\?\.practice_name/)
  assert.match(sidebar, /accountIdentity\.practiceName\s*\|\|\s*'Practice'/)
})

test('sidebar keeps navigation between practice identity and bottom settings', () => {
  assert.match(sidebar, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(sidebar, /shrink-0 border-t border-sidebar-border p-3/)
  assert.match(sidebar, /to="\/settings"/)
  assert.match(sidebar, />Settings<\/span>/)
  assert.doesNotMatch(sidebar, /accountIdentity\.name/)
  assert.doesNotMatch(sidebar, /accountIdentity\.subtitle/)
  assert.doesNotMatch(sidebar, /accountIdentity\.initials/)
  assert.doesNotMatch(sidebar, /aria-haspopup="menu"/)
  assert.doesNotMatch(sidebar, /MoreHorizontal/)
})

test('sidebar exposes transcript inbox as persistent workspace navigation', () => {
  assert.match(sidebar, /name:\s*'Transcript Inbox'/)
  assert.match(sidebar, /path:\s*'\/transcripts'/)
})

test('desktop and mobile sidebars receive the same practice identity', () => {
  const sidebarInvocations = shell.match(/<AppSidebar/g) || []
  assert.ok(sidebarInvocations.length >= 2, 'Should have at least 2 AppSidebar instances (desktop/mobile)')

  const identityProps = shell.match(/:account-identity="accountIdentity"/g) || []
  assert.ok(identityProps.length >= 2, 'Should pass accountIdentity prop to both instances')
})
