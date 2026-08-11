import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')

test('app shell distinguishes full-height workspaces from ordinary scrolling pages', () => {
  assert.match(shell, /fullHeightWorkspacePaths=new Set\(\['\/calendar','\/transcripts'\]\)/)
  assert.match(shell, /isFullHeightWorkspace\s*\?\s*'overflow-hidden'\s*:\s*'overflow-y-auto overflow-x-hidden'/)
})

test('app shell propagates min-height zero through the flex content chain', () => {
  assert.match(shell, /flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden/)
  assert.match(shell, /<main class="flex-1 min-h-0 bg-surface-canvas relative"/)
})

test('transcripts owns its internal scrolling only because it is a full-height workspace', () => {
  assert.match(transcripts, /flex flex-col h-full bg-surface-canvas overflow-hidden/)
  assert.match(transcripts, /<main v-else class="flex-1 overflow-y-auto p-page">/)
})

test('sidebar remains scrollable on short screens but never renders a scrollbar rail', () => {
  assert.match(shell, /sidebar-navigation flex-1 min-h-0 overflow-y-auto/)
  assert.match(shell, /\.sidebar-navigation\{scrollbar-width:none;-ms-overflow-style:none\}/)
  assert.match(shell, /\.sidebar-navigation::-webkit-scrollbar\{display:none;width:0;height:0\}/)
  assert.doesNotMatch(shell, /\.sidebar-navigation:hover/)
})
