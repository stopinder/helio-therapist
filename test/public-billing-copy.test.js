import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landing = fs.readFileSync('src/views/Landing.vue', 'utf8');
const terms = fs.readFileSync('src/views/Terms.vue', 'utf8');

test('public pricing exposes only the £29 monthly offer with a 30 day trial', () => {
  assert.match(landing, /30 days free, then £29\/month\. Cancel anytime\./);
  assert.doesNotMatch(landing, /£24|Founder offer/);
});

test('terms describe live Stripe subscription billing', () => {
  assert.match(terms, /£29\/month after a 30-day free trial/);
  assert.match(terms, /payment method is collected/);
  assert.match(terms, /cancel anytime/);
  assert.match(terms, /processed by Stripe/);
  assert.doesNotMatch(terms, /Billing is not yet implemented|founder-rate/);
});
