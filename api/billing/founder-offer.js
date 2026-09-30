import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient, getStripePriceId } from '../_lib/stripe.js';

const ANNUAL_PRICE_ID = 'price_1ULJ1uBCxePdT6Vno9ULJ9v0';

function protectedUntilIso() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 2);
  return date.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const plan = req.body?.plan;
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Choose monthly or annual billing.' });
    }

    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: stored, error } = await supabase
      .from('therapist_subscriptions')
      .select('stripe_subscription_id,status,cancel_at_period_end')
      .eq('therapist_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!stored?.stripe_subscription_id || stored.status !== 'trialing' || stored.cancel_at_period_end) {
      return res.status(409).json({ error: 'This option is available only during an active free trial.' });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(stored.stripe_subscription_id);

    if (subscription.status !== 'trialing' || subscription.cancel_at_period_end) {
      return res.status(409).json({ error: 'This option is available only during an active free trial.' });
    }

    const item = subscription.items?.data?.[0];
    if (!item?.id) {
      return res.status(409).json({ error: 'Unable to identify the current Helios subscription item.' });
    }

    const monthlyPriceId = getStripePriceId();
    const targetPriceId = plan === 'annual' ? ANNUAL_PRICE_ID : monthlyPriceId;
    const founderPriceProtectedUntil = protectedUntilIso();

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: targetPriceId, quantity: 1 }],
      trial_end: 'now',
      proration_behavior: 'none',
      payment_behavior: 'allow_incomplete',
      metadata: {
        ...subscription.metadata,
        founder_status: 'true',
        founder_plan: plan,
        founder_price_protected_until: founderPriceProtectedUntil
      },
      expand: ['latest_invoice']
    });

    const invoice = updated.latest_invoice && typeof updated.latest_invoice === 'object'
      ? updated.latest_invoice
      : null;

    return res.status(200).json({
      accepted: true,
      plan,
      amount: plan === 'annual' ? 290 : 29,
      interval: plan === 'annual' ? 'year' : 'month',
      priceProtectedUntil: founderPriceProtectedUntil,
      paymentStatus: invoice?.status || null,
      paymentUrl: invoice?.status !== 'paid' ? invoice?.hosted_invoice_url || null : null
    });
  } catch (error) {
    console.error('[Founding Subscriber]', error.message);
    return res.status(error.status || 500).json({
      error: error.status === 401 ? error.message : 'Unable to start the paid subscription'
    });
  }
}
