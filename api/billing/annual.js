import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

const ANNUAL_PRICE_ID = 'price_1ULJ1uBCxePdT6Vno9ULJ9v0';

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
    const { data: stored, error } = await supabase
      .from('therapist_subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,stripe_price_id,status,cancel_at_period_end')
      .eq('therapist_id', user.id)
      .maybeSingle();

    if (error) throw error;

    const stripe = getStripeClient();
    const origin = appOrigin(req);

    if (!stored?.stripe_subscription_id || !['active','trialing','past_due','unpaid','paused'].includes(stored.status)) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: ANNUAL_PRICE_ID, quantity: 1 }],
        success_url: `${origin}/settings?billing=annual-success`,
        cancel_url: `${origin}/settings?billing=cancelled`,
        client_reference_id: user.id,
        customer: stored?.stripe_customer_id || undefined,
        customer_email: stored?.stripe_customer_id ? undefined : user.email,
        subscription_data: { metadata: { therapist_id: user.id, billing_plan: 'annual' } },
        metadata: { therapist_id: user.id, billing_plan: 'annual' }
      });
      return res.status(200).json({ url: session.url });
    }

    if (stored.status === 'trialing') {
      return res.status(409).json({ error: 'Use the founding subscriber options while your free trial is active.' });
    }

    if (stored.status !== 'active') {
      return res.status(409).json({ error: 'Please resolve the current subscription status before switching plans.' });
    }

    if (stored.cancel_at_period_end) {
      return res.status(409).json({ error: 'Resume your subscription before switching to annual billing.' });
    }

    const subscription = await stripe.subscriptions.retrieve(stored.stripe_subscription_id);
    const item = subscription.items?.data?.[0];
    if (!item?.id) return res.status(409).json({ error: 'Unable to identify the current subscription item.' });
    if (item.price?.id === ANNUAL_PRICE_ID) {
      return res.status(200).json({ url: `${origin}/settings?billing=annual-success`, alreadyAnnual: true });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: ANNUAL_PRICE_ID, quantity: 1 }],
      billing_cycle_anchor: 'now',
      proration_behavior: 'create_prorations',
      payment_behavior: 'allow_incomplete',
      metadata: {
        ...subscription.metadata,
        billing_plan: 'annual'
      },
      expand: ['latest_invoice']
    });

    const invoice = updated.latest_invoice && typeof updated.latest_invoice === 'object'
      ? updated.latest_invoice
      : null;

    const paymentUrl = invoice?.status !== 'paid' ? invoice?.hosted_invoice_url || null : null;
    return res.status(200).json({
      url: paymentUrl || `${origin}/settings?billing=annual-success`,
      plan: 'annual',
      amount: 290,
      creditedUnusedMonthlyTime: true
    });
  } catch (error) {
    console.error('[Annual Billing]', error.message);
    return res.status(error.status || 500).json({
      error: error.status === 401 ? error.message : 'Unable to start annual billing'
    });
  }
}
