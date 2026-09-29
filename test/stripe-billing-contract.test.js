import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const checkout = fs.readFileSync('api/billing/checkout.js','utf8');
const checkoutSession = fs.readFileSync('api/billing/checkout-session.js','utf8');
const webhook = fs.readFileSync('api/billing/webhook.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260924110000_add_therapist_subscriptions.sql','utf8');

test('Stripe checkout uses configured price and 30 day trial', () => {
  assert.match(checkout, /getStripePriceId/);
  assert.match(checkout, /trial_period_days:\s*30/);
  assert.match(checkout, /therapist_id:\s*user\.id/);
});

test('Stripe checkout success includes the checkout session id for verified attribution', () => {
  assert.match(checkout, /billing=success&checkout_session_id=\{CHECKOUT_SESSION_ID\}/);
});

test('checkout-session endpoint verifies ownership and a completed trial subscription', () => {
  assert.match(checkoutSession, /requireAuthenticatedUser/);
  assert.match(checkoutSession, /checkout\.sessions\.retrieve/);
  assert.match(checkoutSession, /therapistId !== user\.id/);
  assert.match(checkoutSession, /checkoutSession\.status === 'complete'/);
  assert.match(checkoutSession, /subscriptionStatus === 'trialing'/);
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
