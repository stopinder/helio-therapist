import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landing = fs.readFileSync('src/views/Landing.vue', 'utf8');
const terms = fs.readFileSync('src/views/Terms.vue', 'utf8');

test('public pricing exposes only the £29 monthly offer with a 7 day trial', () => {
  const pricingSection = landing.match(/<section id="pricing"[\s\S]*?<\/section>/)?.[0] || '';
  const pricingText = pricingSection.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(pricingText, /7 days free, then £29\/month\./);
  assert.match(pricingText, /Cancel anytime\./);
  assert.match(landing, /id="pricing"/);
  assert.match(landing, /Start your 7-day free trial/);
  assert.doesNotMatch(landing, /£24|Founder offer/);
});

test('terms describe live Stripe subscription billing', () => {
  assert.match(terms, /£29\/month after a 7-day free trial/);
  assert.match(terms, /payment method is collected/);
  assert.match(terms, /cancel anytime/);
  assert.match(terms, /processed by Stripe/);
  assert.doesNotMatch(terms, /Billing is not yet implemented|founder-rate/);
});
