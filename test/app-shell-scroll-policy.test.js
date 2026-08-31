import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')

test('app shell distinguishes full-height workspaces from ordinary scrolling pages', () => {
  assert.match(shell, /fullHeightWorkspacePaths/)
  assert.match(shell, /\/calendar/)
  assert.match(shell, /\/transcripts/)
  assert.match(shell, /overflow-y-auto overflow-x-hidden/)
})

test('app shell propagates min-height zero through the flex content chain', () => {
  const shellContentClass = shell.match(/<div class="([^"]*overflow-hidden[^"]*)">\s*<header/)?.[1] || ''
  const mainClass = shell.match(/<main\s+class="([^"]*)"\s+:class="isFullHeightWorkspace/)?.[1] || ''

  for (const className of ['flex', 'flex-col', 'flex-1', 'min-w-0', 'min-h-0', 'h-full', 'overflow-hidden']) {
    assert.ok(shellContentClass.split(/\s+/).includes(className), `shell content is missing ${className}`)
  }
  for (const className of ['flex-1', 'min-h-0', 'bg-surface-canvas', 'relative']) {
    assert.ok(mainClass.split(/\s+/).includes(className), `main content is missing ${className}`)
  }
})

test('transcripts owns its internal scrolling only because it is a full-height workspace', () => {
  assert.match(transcripts, /flex flex-col h-full bg-surface-canvas overflow-hidden/)
  assert.match(transcripts, /flex-1 overflow-y-auto p-page/)
})

test('sidebar remains scrollable on short screens but hides its scrollbar rail', () => {
  assert.match(shell, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /scrollbar-width:\s*none/)
  assert.match(shell, /sidebar-navigation::-webkit-scrollbar/)
  assert.match(shell, /display:\s*none/)
  assert.doesNotMatch(shell, /\.sidebar-navigation:hover/)
})

test('permanent sidebar is used from tablet and desktop widths while phones use the menu drawer', () => {
  assert.match(shell, /bg-sidebar shadow-overlay md:hidden/)
  assert.match(shell, /bg-backdrop backdrop-blur-sm md:hidden/)
  assert.match(shell, /bg-sidebar md:flex/)

  const openMenuButton = shell.match(/<button[^>]*aria-label="Open menu"[^>]*>/)?.[0] || ''
  assert.ok(openMenuButton, 'Open menu button is missing')
  assert.match(openMenuButton, /class="[^"]*\bmd:hidden\b[^"]*"/)

  assert.doesNotMatch(shell, /bg-sidebar shadow-overlay lg:hidden/)
  assert.doesNotMatch(shell, /bg-sidebar lg:flex/)
})
