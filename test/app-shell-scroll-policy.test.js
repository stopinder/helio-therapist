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
  assert.match(shell, /flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden/)
  assert.match(shell, /flex-1 min-h-0 bg-surface-canvas relative/)
})

test('transcripts owns its internal scrolling only because it is a full-height workspace', () => {
  assert.match(transcripts, /flex flex-col h-full bg-surface-canvas overflow-hidden/)
  assert.match(transcripts, /flex-1 overflow-y-auto p-page/)
})

test('sidebar remains scrollable on short screens but hides its scrollbar rail', () => {
  assert.match(shell, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /scrollbar-width:none/)
  assert.match(shell, /sidebar-navigation::-webkit-scrollbar/)
  assert.match(shell, /display:none/)
  assert.doesNotMatch(shell, /\.sidebar-navigation:hover/)
})
