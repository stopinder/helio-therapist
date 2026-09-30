import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const settings = fs.readFileSync(path.join(root, 'src/components/Settings.vue'), 'utf8')

test('Settings product boundaries: shows only supported Google and Zoom integrations', () => {
  assert.match(settings, /Google Calendar/)
  assert.match(settings, /Zoom/)
  assert.doesNotMatch(settings, /Calendly/)
})

test('Settings product boundaries: does not expose a non-persistent default video-provider setting', () => {
  assert.doesNotMatch(settings, /Default Video Provider/)
  assert.doesNotMatch(settings, /defaultVideoProvider/)
  assert.doesNotMatch(settings, /local demonstration state/)
  assert.match(settings, /Video links are chosen when scheduling or working with an appointment/)
})

test('Settings product boundaries: does not ship dormant Calendly server endpoints', () => {
  assert.equal(fs.existsSync(path.join(root, 'api/calendly/connect.js')), false)
  assert.equal(fs.existsSync(path.join(root, 'api/calendly/disconnect.js')), false)
  assert.equal(fs.existsSync(path.join(root, 'api/calendly/status.js')), false)
})


test('Settings subscription: exposes monthly trial and annual billing actions', () => {
  assert.match(settings, /7 days free, then £29\/month/)
  assert.match(settings, /£290\/year/)
  assert.match(settings, /two months free/)
  assert.match(settings, /Start 7-day free trial/)
  assert.match(settings, /Subscribe monthly — £29\/month/)
  assert.match(settings, /Existing Helios account/)
  assert.match(settings, /legacyAccess/)
  assert.match(settings, /Pay annually — £290\/year/)
  assert.match(settings, /Switch to annual — £290\/year/)
  assert.match(settings, /\/api\/billing\/checkout/)
  assert.match(settings, /\/api\/billing\/annual/)
  assert.match(settings, /\/api\/billing\/portal/)
  assert.doesNotMatch(settings, /£24/)
})
