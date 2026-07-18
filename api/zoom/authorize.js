import crypto from 'crypto';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const clientId = (process.env.ZOOM_CLIENT_ID || '').trim();
    const redirectUri = (process.env.ZOOM_REDIRECT_URI || '').trim();
    if (!clientId || !redirectUri || !process.env.INTEGRATION_ENCRYPTION_KEY) {
      return res.status(500).json({ error: 'Zoom configuration missing' });
    }
    const state = crypto.randomUUID();
    const { error } = await supabase.from('oauth_states').insert({
      id: state, user_id: user.id, provider: 'zoom',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    if (error) throw error;
    return res.status(200).json({ url: 'https://zoom.us/oauth/authorize?' + new URLSearchParams({
      response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state
    }) });
  } catch (error) {
    console.error('[Zoom Authorize]', error.message);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Unable to start Zoom connection' });
  }
}
