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
