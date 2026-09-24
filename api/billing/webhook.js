import { getSupabaseClient } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
const isoFromUnix = (value) => value ? new Date(value * 1000).toISOString() : null;

async function syncSubscription(supabase, subscription) {
  const therapistId = subscription.metadata?.therapist_id;
  if (!therapistId) throw new Error('Stripe subscription missing therapist_id metadata');
  const { error } = await supabase.from('therapist_subscriptions').upsert({
    therapist_id: therapistId,
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    status: subscription.status,
    trial_ends_at: isoFromUnix(subscription.trial_end),
    current_period_ends_at: isoFromUnix(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString()
  }, { onConflict: 'therapist_id' });
  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) return res.status(500).json({ error: 'Webhook configuration missing' });
  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], secret);
    if (['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) {
      await syncSubscription(getSupabaseClient(), event.data.object);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook]', error.message);
    return res.status(400).json({ error: 'Invalid webhook' });
  }
}
