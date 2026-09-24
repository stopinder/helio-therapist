import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient, getStripePriceId } from '../_lib/stripe.js';

function appOrigin(req) {
  const configured = (process.env.APP_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: existing, error: dbError } = await supabase.from('therapist_subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,status').eq('therapist_id', user.id).maybeSingle();
    if (dbError) throw dbError;
    if (existing?.stripe_subscription_id && ['trialing','active','past_due','unpaid','paused'].includes(existing.status)) {
      return res.status(409).json({ error: 'Subscription already exists' });
    }
    const stripe = getStripeClient();
    const origin = appOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      client_reference_id: user.id,
      customer: existing?.stripe_customer_id || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email,
      subscription_data: { trial_period_days: 30, metadata: { therapist_id: user.id } },
      metadata: { therapist_id: user.id }
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[Billing Checkout]', error.message);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to start checkout' });
  }
}
