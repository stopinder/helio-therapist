import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase
    let supabase;
    let user;
    try {
      ({ supabase, user } = await requireAuthenticatedUser(req));
    } catch (err) {
      console.error('[Google Status] Authentication failed:', err.message);
      return res.status(err.status || 500).json({
        error: err.status === 401 ? err.message : 'Database connection failed',
        details: err.message
      });
    }

    // 1. Get integration from Supabase
    // FUTURE MIGRATION: Query by user_id when Supabase Auth is introduced.
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[Google Status] Database error:', dbError);
      return res.status(500).json({ 
        error: 'Database error',
        details: dbError.message 
      });
    }

    if (!integration) {
      return res.status(200).json({ connected: false });
    }

    // Return safe metadata (no tokens)
    return res.status(200).json({
      connected: true,
      last_synced_at: integration.last_synced_at
    });
  } catch (error) {
    console.error('[Google Status] Internal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
