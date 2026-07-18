import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('provider', 'calendly')
      .eq('user_id', user.id);

    if (error) throw error;
    return res.status(200).json({ connected: false });
  } catch (error) {
    console.error('[Calendly Disconnect] Error:', error);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
