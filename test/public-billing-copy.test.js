import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const landing = fs.readFileSync('src/views/Landing.vue', 'utf8');
const terms = fs.readFileSync('src/views/Terms.vue', 'utf8');

test('public pricing explains no-card Free and optional monthly/annual Professional upgrades', () => {
  const pricingSection = landing.match(/<section id="pricing"[\s\S]*?<\/section>/)?.[0] || '';
  const pricingText = pricingSection.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(pricingText, /Free forever/);
  assert.match(pricingText, /five active clients/);
  assert.match(pricingText, /no payment card required/);
  assert.match(pricingText, /£29\/month/);
  assert.match(pricingText, /£290\/year paid upfront/);
  assert.match(landing, /id="pricing"/);
  assert.match(landing, /Start Free — no card required/);
  assert.doesNotMatch(landing, /7.day free trial|7 days free/i);
  assert.doesNotMatch(landing, /£24|Founder offer/);
});

test('terms describe live Stripe subscription billing', () => {
  assert.match(terms, /Free plan without entering payment details/);
  assert.match(terms, /up to five active clients/);
  assert.match(terms, /£29\/month or £290\/year paid upfront/);
  assert.match(terms, /may cancel a paid subscription/);
  assert.doesNotMatch(terms, /7-day free trial/);
  assert.match(terms, /processed by Stripe/);
  assert.doesNotMatch(terms, /Billing is not yet implemented|founder-rate/);
});
