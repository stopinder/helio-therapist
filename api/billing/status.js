import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data, error } = await supabase.from('therapist_subscriptions')
      .select('status,trial_ends_at,current_period_ends_at,cancel_at_period_end')
      .eq('therapist_id', user.id).maybeSingle();
    if (error) throw error;
    return res.status(200).json({ subscription: data || null });
  } catch (error) {
    console.error('[Billing Status]', error.message);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to load subscription' });
  }
}
