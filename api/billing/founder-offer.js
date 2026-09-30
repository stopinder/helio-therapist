import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

const COUPON_ID = 'helios_founder_2400_12m';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: stored, error } = await supabase
      .from('therapist_subscriptions')
      .select('stripe_subscription_id,status,cancel_at_period_end')
      .eq('therapist_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!stored?.stripe_subscription_id || stored.status !== 'trialing' || stored.cancel_at_period_end) {
      return res.status(409).json({ error: 'Founder offer is available only during an active free trial.' });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(stored.stripe_subscription_id);

    if (subscription.metadata?.founder_offer === 'accepted') {
      return res.status(200).json({ accepted: true, alreadyAccepted: true });
    }

    if (subscription.status !== 'trialing' || subscription.cancel_at_period_end) {
      return res.status(409).json({ error: 'Founder offer is available only during an active free trial.' });
    }

    await stripe.subscriptions.update(subscription.id, {
      discounts: [{ coupon: COUPON_ID }],
      trial_end: 'now',
      proration_behavior: 'none',
      payment_behavior: 'error_if_incomplete',
      metadata: {
        ...subscription.metadata,
        founder_offer: 'accepted',
        founder_offer_monthly_gbp: '24.00',
        founder_offer_paid_months: '12'
      }
    });

    return res.status(200).json({ accepted: true, chargedNow: true, monthlyPrice: 24, paidMonths: 12 });
  } catch (error) {
    console.error('[Founder Offer]', error.message);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to apply founder offer' });
  }
}
