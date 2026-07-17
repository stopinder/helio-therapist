import crypto from 'crypto';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Google configuration missing',
        details: 'GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be configured in Vercel.'
      });
    }

    const state = crypto.randomUUID();
    const { error: stateError } = await supabase.from('oauth_states').insert({
      id: state,
      user_id: user.id,
      provider: 'google',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    if (stateError) {
      console.error('[Google Authorize] Failed to store OAuth state:', stateError);
      return res.status(500).json({ error: 'Unable to start Google connection' });
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    });
  } catch (error) {
    console.error('[Google Authorize] Error:', error);
    return res.status(error.status || 500).json({
      error: error.status === 401 ? error.message : 'Unable to start Google connection'
    });
  }
}
