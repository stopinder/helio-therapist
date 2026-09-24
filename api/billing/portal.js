import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { getStripeClient } from '../_lib/stripe.js';

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
    const { data, error } = await supabase.from('therapist_subscriptions')
      .select('stripe_customer_id').eq('therapist_id', user.id).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No billing account found' });
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appOrigin(req)}/settings`
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[Billing Portal]', error.message);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to open billing portal' });
  }
}
