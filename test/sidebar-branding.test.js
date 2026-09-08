import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shellUrl = new URL('../src/layouts/AppShell.vue', import.meta.url)
const sidebarUrl = new URL('../src/components/shell/AppSidebar.vue', import.meta.url)

test('AppShell loads practice_name from profiles', async () => {
  const shell = await readFile(shellUrl, 'utf8')
  // Verify practice_name is selected from profiles table
  assert.match(shell, /select\('[^']*practice_name[^']*'\)/, 'Should select practice_name from profiles')
  // Verify it is assigned to accountIdentity
  assert.match(shell, /accountIdentity\.value\s*=\s*\{[^}]*practiceName:[^}]*\}/, 'Should assign practiceName to accountIdentity')
})

test('AppSidebar displays practice_name if available, falling back to Helios', async () => {
  const sidebar = await readFile(sidebarUrl, 'utf8')
  // Verify it uses accountIdentity.practiceName or fallback
  assert.match(sidebar, /\{\{\s*accountIdentity\.practiceName\s*\|\|\s*accountIdentity\.name\s*\|\|\s*'Helios'\s*\}\}/, 'Should display practiceName with name and Helios fallback')
})
