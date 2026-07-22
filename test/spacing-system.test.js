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

test('semantic surface, border, and elevation tokens are defined once and exposed to Tailwind', async () => {
  const css = await readFile(new URL('../src/main.css', import.meta.url), 'utf8')
  const config = await readFile(new URL('../tailwind.config.js', import.meta.url), 'utf8')

  for (const token of ['surface-canvas', 'surface', 'surface-muted', 'surface-subtle', 'surface-elevated', 'surface-overlay', 'border', 'border-muted', 'border-strong']) {
    assert.match(css, new RegExp(`--${token}:`))
    assert.match(config, new RegExp(`(?:'${token}'|${token}): 'var\\(--${token}\\)'`))
  }
  for (const token of ['shadow-elevated', 'shadow-overlay']) {
    assert.match(css, new RegExp(`--${token}:`))
  }
  assert.match(config, /elevated: 'var\(--shadow-elevated\)'/)
  assert.match(config, /overlay: 'var\(--shadow-overlay\)'/)
})

test('semantic interaction and motion tokens are defined once and exposed to Tailwind', async () => {
  const css = await readFile(new URL('../src/main.css', import.meta.url), 'utf8')
  const config = await readFile(new URL('../tailwind.config.js', import.meta.url), 'utf8')

  for (const token of ['hover', 'active', 'selected', 'focus-ring', 'disabled', 'loading', 'success', 'warning', 'danger', 'recording', 'ai-working']) {
    assert.match(css, new RegExp(`--state-${token}:`))
    assert.match(config, new RegExp(`['"]state-${token}['"]: 'var\\(--state-${token}\\)'`))
  }
  for (const token of ['fast', 'standard', 'slow']) assert.match(css, new RegExp(`--motion-${token}:`))
  assert.match(css, /:focus-visible/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('primary drawers use the shared keyboard focus trap', async () => {
  const focusTrap = await readFile(new URL('../src/composables/useFocusTrap.js', import.meta.url), 'utf8')
  const [clientDrawer, aiDrawer] = await Promise.all([
    readFile(new URL('../src/components/tools/ClientContextDrawer.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AIInsightDrawer.vue', import.meta.url), 'utf8')
  ])
  assert.match(focusTrap, /event\.key !== 'Tab'/)
  assert.match(focusTrap, /previouslyFocused/)
  assert.match(clientDrawer, /useFocusTrap/)
  assert.match(aiDrawer, /useFocusTrap/)
})

test('shared visual decisions have semantic tokens and templates do not use arbitrary colour utilities', async () => {
  const css = await readFile(new URL('../src/main.css', import.meta.url), 'utf8')
  const config = await readFile(new URL('../tailwind.config.js', import.meta.url), 'utf8')
  const sources = await Promise.all((await import('node:child_process')).execFileSync('rg', ['--files', 'src', '-g', '*.{vue,css}'], { encoding: 'utf8' })
    .trim().split('\n').map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')))

  for (const token of ['text-primary', 'text-secondary', 'text-muted', 'action-primary', 'action-link', 'radius-control', 'radius-panel', 'control-target']) {
    assert.match(css, new RegExp(`--${token}:`))
  }
  for (const name of ['ink', 'action-primary', 'action-link', 'backdrop']) {
    assert.match(config, new RegExp(`(?:['"]${name}['"]|\\b${name}):`))
  }
  for (const source of sources) {
    assert.doesNotMatch(source, /(?:bg|text|border|ring)-\[[^\]]+\]/)
  }
})
