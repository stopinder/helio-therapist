import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const checkout = fs.readFileSync('api/billing/checkout.js','utf8');
const webhook = fs.readFileSync('api/billing/webhook.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260924110000_add_therapist_subscriptions.sql','utf8');

test('Stripe checkout uses configured price and 30 day trial', () => {
  assert.match(checkout, /getStripePriceId/);
  assert.match(checkout, /trial_period_days:\s*30/);
  assert.match(checkout, /therapist_id:\s*user\.id/);
});
test('Stripe webhook verifies signatures before syncing subscriptions', () => {
  assert.match(webhook, /constructEvent/);
  assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
  assert.match(webhook, /customer\.subscription\.updated/);
});
test('subscription table is server-write and therapist-read only', () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /for select/i);
  assert.doesNotMatch(migration, /for (insert|update|delete)/i);
});
