import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scheduleTrialCancellation } from '../api/billing/cancel-trial.js';

const endpoint = await readFile(new URL('../api/billing/cancel-trial.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/components/Settings.vue', import.meta.url), 'utf8');

test('trial cancellation schedules the end of trial without an immediate charge', async () => {
  const calls = [];
  const stripe = { subscriptions: {
    retrieve: async () => ({ status: 'trialing', trial_end: 2_000_000_000, cancel_at_period_end: false, metadata: { therapist_id: 'owner' } }),
    update: async (id, params) => { calls.push({ id, params }); return { cancel_at_period_end: true }; }
  } };
  const result = await scheduleTrialCancellation(stripe, 'sub_1', 'owner', 1_900_000_000_000);
  assert.deepEqual(calls, [{ id: 'sub_1', params: { cancel_at_period_end: true } }]);
  assert.equal(result.cancel_at_period_end, true);
  assert.equal(result.trial_ends_at, new Date(2_000_000_000_000).toISOString());
});

test('trial cancellation is idempotent and rejects other owners or expired trials', async () => {
  let updates = 0;
  const subscription = { status: 'trialing', trial_end: 2_000_000_000, cancel_at_period_end: true, metadata: { therapist_id: 'owner' } };
  const stripe = { subscriptions: { retrieve: async () => subscription, update: async () => { updates++; } } };
  assert.equal((await scheduleTrialCancellation(stripe, 'sub_1', 'owner', 1_900_000_000_000)).cancel_at_period_end, true);
  assert.equal(updates, 0);
  await assert.rejects(scheduleTrialCancellation(stripe, 'sub_1', 'other', 1_900_000_000_000), { status: 409 });
  await assert.rejects(scheduleTrialCancellation(stripe, 'sub_1', 'owner', 2_000_000_000_000), { status: 409 });
  subscription.status = 'active';
  await assert.rejects(scheduleTrialCancellation(stripe, 'sub_1', 'owner', 1_900_000_000_000), { status: 409 });
  assert.equal(updates, 0);
});

test('cancellation endpoint checks the signed-in owner; Settings exposes trial cancellation', () => {
  assert.match(endpoint, /requireAuthenticatedUser\(req\)/);
  assert.match(endpoint, /\.eq\('therapist_id', user\.id\)/);
  assert.match(settings, /subscription\?\.status === 'trialing' && !subscription\.cancel_at_period_end/);
  assert.match(settings, /v-else-if="!subscription"[^>]*@click="startSubscription"/);
  assert.match(settings, /Cancel trial/);
  assert.match(settings, /authenticatedFetch\('\/api\/billing\/cancel-trial',\{method:'POST'\}\)/);
});
