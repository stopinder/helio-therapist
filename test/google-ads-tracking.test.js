import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const tracking = fs.readFileSync('src/lib/googleAds.js', 'utf8')
const main = fs.readFileSync('src/main.js', 'utf8')
const authGate = fs.readFileSync('src/AuthGate.vue', 'utf8')

test('Google Ads base tag is installed from app startup', () => {
  assert.match(main, /installGoogleAdsTag\(\)/)
  assert.match(tracking, /AW-18483094940/)
})

test('trial start conversion uses the Helios conversion label with zero value', () => {
  assert.match(tracking, /AW-18483094940\/guOKCLj57IodEJzLtu1E/)
  assert.match(tracking, /value:\s*0/)
  assert.match(tracking, /currency:\s*'EUR'/)
})

test('Free access does not emit a legacy paid-trial conversion', () => {
  assert.doesNotMatch(authGate, /trackTrialStarted\(/)
  assert.match(authGate, /data\.hasWorkspaceAccess === true/)
})

test('trial conversion is deduplicated per signed-in therapist in this browser', () => {
  assert.match(tracking, /localStorage\.getItem\(storageKey\)/)
  assert.match(tracking, /localStorage\.setItem\(storageKey, '1'\)/)
})
