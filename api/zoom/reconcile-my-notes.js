import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { reconcileZoomMyNotes } from '../_lib/zoom-my-notes-reconciliation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('user_id, encrypted_access_token, encrypted_refresh_token, expires_at, token_type, scope')
      .eq('provider', 'zoom')
      .eq('user_id', user.id)
      .maybeSingle();

    if (integrationError) throw integrationError;
    if (!integration) return res.status(409).json({ error: 'Connect Zoom in Settings first.' });

    const result = await reconcileZoomMyNotes({
      supabase,
      integration,
      therapistUserId: user.id
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Zoom My Notes Reconcile]', { message: error.message, status: error.status || 500 });
    return res.status(error.status || 500).json({
      error: error.status && error.status < 500 ? error.message : 'Unable to check Zoom My Notes'
    });
  }
}
