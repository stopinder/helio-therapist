import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const offer = fs.readFileSync('api/billing/founder-offer.js', 'utf8')
const page = fs.readFileSync('src/views/FounderOffer.vue', 'utf8')
const loops = fs.readFileSync('api/_lib/loops-trial.js', 'utf8')
const checkout = fs.readFileSync('api/billing/checkout.js', 'utf8')

test('new Helios trials are seven days', () => {
  assert.match(checkout, /trial_period_days:\s*7/)
})

test('founding subscriber monthly option charges the standard £29 price immediately', () => {
  assert.match(offer, /trial_end:\s*'now'/)
  assert.match(offer, /getStripePriceId\(\)/)
  assert.match(offer, /founder_status:\s*'true'/)
  assert.match(offer, /founder_price_protected_until/)
  assert.match(page, /Subscribe monthly — £29/)
  assert.match(page, /24 months/)
  assert.doesNotMatch(offer, /coupon|helios_founder_2400_12m/)
})

test('founding subscriber annual option uses the £290 annual Stripe price', () => {
  assert.match(offer, /price_1ULJ1uBCxePdT6Vno9ULJ9v0/)
  assert.match(page, /Pay annually — £290/)
  assert.match(page, /save £58/)
})

test('Loops trial event links to the founding subscriber page', () => {
  assert.match(loops, /founderOfferUrl/)
  assert.match(loops, /\/founder-offer/)
})
