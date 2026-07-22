import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('semantic spacing tokens are defined once and exposed to Tailwind', async () => {
  const css = await readFile(new URL('../src/main.css', import.meta.url), 'utf8')
  const config = await readFile(new URL('../tailwind.config.js', import.meta.url), 'utf8')

  for (const token of ['inline-xs', 'inline-sm', 'inline-md', 'inline-lg', 'stack-xs', 'stack-sm', 'stack-md', 'stack-lg', 'stack-xl', 'stack-2xl', 'section', 'page']) {
    assert.match(css, new RegExp(`--space-${token}:`))
    assert.match(config, new RegExp(`(?:'${token}'|${token}): 'var\\(--space-${token}\\)'`))
  }
  assert.match(css, /--space-page: 1rem/)
  assert.match(css, /--space-page: 2rem/)
})

test('priority workspace surfaces use semantic spacing', async () => {
  const files = await Promise.all(['App.vue', 'components/NextSessionPreparation.vue', 'components/NeedsAttention.vue', 'components/ClientDirectory.vue', 'components/tools/ClientContextDrawer.vue', 'components/tools/LeftSidebar.vue'].map(path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8')))
  for (const source of files) assert.match(source, /space-|page-layout|p-stack|px-inline|var\(--space-/)
})
