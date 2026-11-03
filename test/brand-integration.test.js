import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const exists = path => existsSync(new URL('../' + path, import.meta.url))

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

test('dedicated favicon, install metadata and social metadata are wired', () => {
  assert.match(html, /rel="icon" href="\/favicon\.ico\?v=2" sizes="any"/)
  assert.match(html, /sizes="32x32" href="\/icons\/favicon-32x32\.png\?v=2"/)
  assert.match(html, /sizes="16x16" href="\/icons\/favicon-16x16\.png\?v=2"/)
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/icons\/apple-touch-icon\.png\?v=2"/)
  assert.match(html, /rel="manifest" href="\/site\.webmanifest\?v=2"/)
  assert.match(html, /property="og:image" content="https:\/\/helio\.works\/brand\/helios-logo\.png"/)
  assert.match(html, /name="twitter:card" content="summary_large_image"/)

  assert.equal(exists('public/favicon.ico'), true)
  assert.equal(exists('public/icons/favicon-16x16.png'), true)
  assert.equal(exists('public/icons/favicon-32x32.png'), true)
  assert.equal(exists('public/icons/apple-touch-icon.png'), true)
  assert.equal(exists('public/icons/icon-192.png'), true)
  assert.equal(exists('public/icons/icon-512.png'), true)

  const data = JSON.parse(manifest)
  assert.equal(data.short_name, 'Helios')
  assert.equal(data.icons[0].src, '/icons/icon-192.png')
  assert.equal(data.icons[0].sizes, '192x192')
  assert.equal(data.icons[1].src, '/icons/icon-512.png')
  assert.equal(data.icons[1].sizes, '512x512')
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
