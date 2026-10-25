import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseUserClient(req);
    const { data, error } = await db.from('clients').select('id,display_name')
      .eq('user_id', user.id).eq('archived', false)
      .order('updated_at', { ascending: false }).limit(80);
    if (error) throw error;
    return res.status(200).json({ success: true, clients: data || [] });
  } catch (error) {
    const status = error.status === 401 ? 401 : 503;
    return res.status(status).json({ success: false, error: status === 401 ? 'Authentication required' : 'Unable to list clients' });
  }
}
