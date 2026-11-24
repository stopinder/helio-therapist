import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLandingPageCapture, landingProperties } from '../src/lib/landingAnalytics.js'

test('only homepage path and exact known campaign values can leave the page', () => {
  const properties = landingProperties(new URL('https://helio.works/?utm_source=apollo&utm_medium=email&utm_campaign=helios_uk_launch_202611&utm_content=patient-name&email=private@example.com#clinical-note'))
  assert.deepEqual(properties, {
    $pathname: '/', $process_person_profile: false, $geoip_disable: true,
    utm_source: 'apollo', utm_medium: 'email', utm_campaign: 'helios_uk_launch_202611',
  })
  assert.deepEqual(landingProperties(new URL('https://helio.works/?utm_source=private@example.com&utm_campaign=helios_test&utm_campaign=private')), {
    $pathname: '/', $process_person_profile: false, $geoip_disable: true,
  })
})

test('one explicit pageview per document, no events on sign-in or clinical paths', () => {
  const requests = []
  const capture = createLandingPageCapture({ token: 'test-only', host: 'https://capture.example.com',
    fetch: (...args) => { requests.push(args); return Promise.resolve() }, randomUUID: () => 'ephemeral-test-id' })
  for (const path of ['/sign-in', '/get-started', '/overview', '/clients/client-id/sessions/session-id', '/complete?token=private', '/book/private']) {
    capture(new URL(`https://helio.works${path}`))
  }
  assert.equal(requests.length, 0)
  capture(new URL('https://helio.works/?utm_source=apollo&utm_campaign=helios_test&token=private'))
  capture(new URL('https://helio.works/#pricing'))
  capture(new URL('https://helio.works/sign-in'))
  capture(new URL('https://helio.works/'))
  assert.equal(requests.length, 1)
  const [url, options] = requests[0]
  assert.equal(url, 'https://capture.example.com/i/v0/e/')
  assert.equal(options.credentials, 'omit')
  assert.equal(options.referrerPolicy, 'no-referrer')
  assert.deepEqual(JSON.parse(options.body), { api_key: 'test-only', event: '$pageview', distinct_id: 'ephemeral-test-id',
    properties: { $pathname: '/', $process_person_profile: false, $geoip_disable: true, utm_source: 'apollo', utm_campaign: 'helios_test' } })
})

test('missing configuration and blocked analytics fail closed without breaking the page', async () => {
  for (const host of [undefined, 'http://capture.example.com', 'https://capture.example.com/?secret=x']) {
    const capture = createLandingPageCapture({ token: 'test-only', host, fetch: () => assert.fail('must not send') })
    capture(new URL('https://helio.works/'))
  }
  const capture = createLandingPageCapture({ token: 'test-only', host: 'https://capture.example.com',
    randomUUID: () => 'test-id', fetch: () => Promise.reject(new Error('blocked')) })
  assert.doesNotThrow(() => capture(new URL('https://helio.works/')))
  await Promise.resolve()
})
