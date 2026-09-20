import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { sanitiseTelemetryEvent } from '../src/lib/telemetry.js'

test('both telemetry types redact dynamic routes and every query/hash', () => {
  const cases = [
    ['/clients/client-secret?document=doc-secret', '/clients/[redacted]'],
    ['/clients/client-secret/sessions/session-secret?view=transcript', '/clients/[redacted]/sessions/[redacted]'],
    ['/book/booking-secret', '/book/[redacted]'],
    ['/book/encoded%2Fsecret/', '/book/[redacted]'],
    ['/complete?token=questionnaire-secret', '/complete'],
    ['/schedule?clientId=client-secret', '/schedule'],
    ['/transcripts?transcript=transcript-secret&returnClientId=client-secret', '/transcripts'],
    ['/supervision?aiReflection=reflection-secret', '/supervision'],
    ['/sign-in?redirect=%2Fclients%2Fclient-secret', '/sign-in'],
    ['/?code=oauth-secret', '/'],
    ['/get-started?email=private%40example.test', '/get-started'],
  ]
  for (const type of ['pageview', 'vital']) {
    for (const [path, shape] of cases) {
      const event = { type, url: `https://helio.works${path}#access_token=auth-secret`, route: '/raw-secret', extra: 'secret' }
      const original = { ...event }
      assert.deepEqual(sanitiseTelemetryEvent(event), {
        type, url: `https://helio.works${shape}`, ...(type === 'vital' ? { route: shape } : {}),
      })
      assert.deepEqual(event, original)
    }
  }
})

test('public and static workspace pages retain useful aggregate paths', () => {
  for (const path of ['/', '/privacy', '/terms', '/cookies', '/support', '/ai-data', '/overview', '/calendar', '/clients', '/documents', '/settings', '/supervision/reflections', '/supervision/practice-reflection', '/supervision/workspace', '/supervision/growth', '/supervision/insights']) {
    assert.equal(sanitiseTelemetryEvent({ type: 'pageview', url: `https://helio.works${path}?unknown=secret#secret` }).url, `https://helio.works${path}`)
  }
})

test('unknown paths, malformed URLs, credentials and custom events fail closed', () => {
  for (const url of ['https://helio.works/sessions/secret', 'https://helio.works/new/secret', 'https://helio.works/api/google/callback?code=secret', 'https://helio.works/clients/a/other/b', 'https://secret@helio.works/', 'file:///clients/secret', '/clients/secret', 'invalid']) {
    for (const type of ['pageview', 'vital']) assert.equal(sanitiseTelemetryEvent({ type, url }), null)
  }
  for (const event of [null, {}, { type: 'pageview', url: null }, { type: 'event', url: 'https://helio.works/' }]) assert.equal(sanitiseTelemetryEvent(event), null)
})

test('application initializes both SDKs with the tested filter and logging disabled', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8')
  const calls = []
  runInNewContext(main.replace(/^import .*$/gm, ''), {
    sanitiseTelemetryEvent,
    inject: options => calls.push(['analytics', options]),
    injectSpeedInsights: options => calls.push(['speed', options]),
    createApp: () => ({ use() {}, mount() {} }), AuthGate: {},
    router: { isReady: () => ({ then() {} }) },
  })
  assert.equal(calls.length, 2)
  for (const [, options] of calls) {
    assert.equal(options.beforeSend, sanitiseTelemetryEvent)
    assert.equal(options.debug, false)
  }
})
