import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

const isoFromUnix = (value) => value ? new Date(value * 1000).toISOString() : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user } = await requireAuthenticatedUser(req);
    const sessionId = String(req.query?.session_id || '').trim();
    if (!sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid checkout session' });
    }

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    const therapistId = checkoutSession.client_reference_id || checkoutSession.metadata?.therapist_id;
    if (therapistId !== user.id) {
      return res.status(403).json({ error: 'Checkout session does not belong to this account' });
    }

    const subscription = checkoutSession.subscription;
    const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
    const subscriptionStatus = typeof subscription === 'string' ? null : subscription?.status;

    const verifiedTrialStarted = checkoutSession.mode === 'subscription'
      && checkoutSession.status === 'complete'
      && Boolean(subscriptionId)
      && subscriptionStatus === 'trialing';

    return res.status(200).json({
      verifiedTrialStarted,
      checkoutSessionId: checkoutSession.id,
      subscriptionId: subscriptionId || null,
      trialEndsAt: typeof subscription === 'string' ? null : isoFromUnix(subscription?.trial_end)
    });
  } catch (error) {
    console.error('[Billing Checkout Session]', error.message);
    if (error.status === 401) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: 'Unable to verify checkout session' });
  }
}
