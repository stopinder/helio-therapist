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

test('founder offer ends the trial and charges the £24 founder rate immediately', () => {
  assert.match(offer, /helios_founder_2400_12m/)
  assert.match(offer, /trial_end:\s*'now'/)
  assert.match(offer, /payment_behavior:\s*'error_if_incomplete'/)
  assert.match(offer, /founder_offer_monthly_gbp:\s*'24\.00'/)
  assert.match(page, /£24 payment is taken today|charged £24 today/)
})

test('Loops trial event links to the founder offer page', () => {
  assert.match(loops, /founderOfferUrl/)
  assert.match(loops, /\/founder-offer/)
})
