import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const overview = await readFile(new URL('../src/views/Overview.vue', import.meta.url), 'utf8')
const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/main.css', import.meta.url), 'utf8')

test('Midnight Meridian composition establishes a singular focal point and continuous folio', () => {
  assert.match(overview, /midnight-orientation/)
  assert.match(overview, /midnight-aperture/)
  assert.match(overview, /midnight-session-action/)
  assert.match(overview, /midnight-folio/)
  assert.match(overview, /midnight-ledger-row/)
  assert.match(overview, /midnight-attached-work/)
  assert.doesNotMatch(overview, /<SurfaceCard\s+v-for="event in todayEvents"/)
})

test('Midnight Meridian shell uses bound navigation with a quieter mobile companion', () => {
  assert.match(shell, /midnight-nav-active/)
  assert.match(shell, /midnight-nav-index/)
  assert.match(shell, /midnight-mobile-index/)
  assert.match(shell, /displayName:\s*'Today'/)
  assert.match(shell, /data-testid="workspace-shell"/)
})

test('Midnight Meridian palette is low-glare and reserves amber for signals', () => {
  assert.match(css, /--midnight-deep:\s*#091522/i)
  assert.match(css, /--midnight:\s*#102235/i)
  assert.match(css, /--midnight-steel:\s*#294761/i)
  assert.match(css, /--surface-canvas:\s*#DCE3E9/i)
  assert.match(css, /--midnight-amber:\s*#C89B68/i)
  assert.doesNotMatch(css, /#5920A5|#D6C93E|#F1E785/i)
})
