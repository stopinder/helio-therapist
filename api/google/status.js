import * as cookie from 'cookie';
// Removing global supabase import to initialize inside handler

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Google Status] Supabase configuration missing');
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: 'Supabase configuration is missing on the server.'
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get integration from Supabase
    // FUTURE MIGRATION: Query by user_id when Supabase Auth is introduced.
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
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
