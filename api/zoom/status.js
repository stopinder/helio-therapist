import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data, error } = await supabase.from('integrations')
      .select('updated_at, encrypted_refresh_token').eq('user_id', user.id).eq('provider', 'zoom').maybeSingle();
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ connected: Boolean(data?.encrypted_refresh_token), connected_at: data?.updated_at || null });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to check Zoom connection' });
  }
}
