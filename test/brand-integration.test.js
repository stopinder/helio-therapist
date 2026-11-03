import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const landing = read('src/views/Landing.vue')
const publicShell = read('src/components/PublicPageShell.vue')
const sidebar = read('src/components/shell/AppSidebar.vue')
const auth = read('src/AuthGate.vue')
const terms = read('src/views/Terms.vue')
const html = read('index.html')
const manifest = read('public/site.webmanifest')
const welcome = read('api/_lib/emails/heliosWelcomeEmail.js')

test('approved Helios logo replaces public placeholder branding', () => {
  assert.match(landing, /\/brand\/helios-logo\.png/)
  assert.match(landing, /footer-brand-logo/)
  assert.doesNotMatch(landing, /brand-mark-dot/)
  assert.doesNotMatch(landing, />helios\.<\/router-link>/)
  assert.match(publicShell, /\/brand\/helios-logo\.png/)
  assert.doesNotMatch(publicShell, /☼/)
})

test('workspace and authentication surfaces use the approved brand assets', () => {
  assert.match(sidebar, /\/brand\/helios-mark\.png/)
  assert.doesNotMatch(sidebar, /<Sun class="workspace-icon"/)
  assert.match(auth, /\/brand\/helios-logo\.png/)
})

test('favicon, install metadata and social metadata are wired', () => {
  assert.match(html, /rel="icon"[^>]+\/brand\/helios-mark\.png/)
  assert.match(html, /rel="apple-touch-icon"[^>]+\/brand\/helios-mark\.png/)
  assert.match(html, /rel="manifest" href="\/site\.webmanifest"/)
  assert.match(html, /property="og:image" content="https:\/\/helio\.works\/brand\/helios-logo\.png"/)
  assert.match(html, /name="twitter:card" content="summary_large_image"/)
  const data = JSON.parse(manifest)
  assert.equal(data.short_name, 'Helios')
  assert.equal(data.icons[0].src, '/brand/helios-mark.png')
  assert.equal(data.icons[0].sizes, '512x512')
})

test('launch-facing copy no longer presents Helios as a beta product', () => {
  assert.doesNotMatch(publicShell, /Testing \/ beta/)
  assert.doesNotMatch(terms, /Testing and beta service/)
  assert.doesNotMatch(terms, /in testing and beta/)
  assert.match(terms, /Service availability/)
})

test('welcome email uses the live logo and launch brand language', () => {
  assert.match(welcome, /https:\/\/helio\.works\/brand\/helios-logo\.png/)
  assert.match(welcome, /#F28C2B/)
  assert.doesNotMatch(welcome, /still being shaped/)
  assert.doesNotMatch(welcome, /is being built as/)
})
