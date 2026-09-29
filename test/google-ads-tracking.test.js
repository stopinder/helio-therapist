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

test('trial conversion fires only after the existing successful billing flow grants access', () => {
  assert.match(authGate, /route\.query\.billing === 'success'/)
  assert.match(authGate, /billingAllowed\.value/)
  assert.match(authGate, /trackTrialStarted\(session\.value\?\.user\?\.id\)/)
})

test('trial conversion is deduplicated per signed-in therapist in this browser', () => {
  assert.match(tracking, /localStorage\.getItem\(storageKey\)/)
  assert.match(tracking, /localStorage\.setItem\(storageKey, '1'\)/)
})
