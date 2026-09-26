import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

export async function scheduleTrialCancellation(stripe, subscriptionId, therapistId, now = Date.now()) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.metadata?.therapist_id !== therapistId || subscription.status !== 'trialing' ||
      !subscription.trial_end || subscription.trial_end * 1000 <= now) {
    const error = new Error('This trial can no longer be cancelled here. Please contact support.');
    error.status = 409;
    throw error;
  }

  const updated = subscription.cancel_at_period_end
    ? subscription
    : await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  return { cancel_at_period_end: updated.cancel_at_period_end, trial_ends_at: new Date(subscription.trial_end * 1000).toISOString() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data, error } = await supabase.from('therapist_subscriptions')
      .select('stripe_subscription_id').eq('therapist_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_subscription_id) return res.status(404).json({ error: 'No trial subscription found' });

    const result = await scheduleTrialCancellation(getStripeClient(), data.stripe_subscription_id, user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Cancel Trial]', error.message);
    return res.status(error.status || 500).json({ error: [401, 409].includes(error.status) ? error.message : 'Unable to cancel trial' });
  }
}
