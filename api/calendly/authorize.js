import crypto from 'crypto';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

const SCOPES = [
  'users:read',
  'event_types:read',
  'scheduled_events:read',
  'webhooks:write'
];

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const clientId = (process.env.CALENDLY_CLIENT_ID || '').trim();
    const redirectUri = (process.env.CALENDLY_REDIRECT_URI || '').trim();

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Calendly configuration missing',
        details: 'CALENDLY_CLIENT_ID and CALENDLY_REDIRECT_URI must be configured in Vercel.'
      });
    }

    const state = crypto.randomUUID();
    const codeVerifier = base64Url(crypto.randomBytes(64));
    const codeChallenge = base64Url(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );

    const { error: stateError } = await supabase.from('oauth_states').insert({
      id: state,
      user_id: user.id,
      provider: 'calendly',
      pending_credentials: { code_verifier: codeVerifier },
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    if (stateError) {
      console.error('[Calendly Authorize] Failed to store OAuth state:', stateError);
      return res.status(500).json({ error: 'Unable to start Calendly connection' });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      url: `https://auth.calendly.com/oauth/authorize?${params.toString()}`
    });
  } catch (error) {
    console.error('[Calendly Authorize] Error:', error);
    return res.status(error.status || 500).json({
      error: error.status === 401 ? error.message : 'Unable to start Calendly connection'
    });
  }
}
