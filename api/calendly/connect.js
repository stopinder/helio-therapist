import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const token = String(req.body?.token || '').trim();

    if (!token || token.length < 20) {
      return res.status(400).json({ error: 'Enter a valid Calendly personal access token' });
    }

    const calendlyResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!calendlyResponse.ok) {
      const details = await calendlyResponse.json().catch(() => ({}));
      console.warn('[Calendly Connect] Token validation failed:', {
        status: calendlyResponse.status,
        error: details?.message || details?.title || 'Calendly rejected the token'
      });
      return res.status(400).json({
        error: calendlyResponse.status === 401
          ? 'Calendly rejected this token. Generate a new token and try again.'
          : 'Unable to verify the Calendly account'
      });
    }

    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        provider: 'calendly',
        access_token: token,
        refresh_token: null,
        expires_at: null,
        token_type: 'Bearer',
        scope: 'personal_access_token',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('[Calendly Connect] Integration upsert failed:', upsertError);
      return res.status(500).json({ error: 'Unable to save the Calendly connection' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ connected: true });
  } catch (error) {
    console.error('[Calendly Connect] Error:', error);
    return res.status(error.status || 500).json({
      error: error.status === 401 ? error.message : 'Unable to connect Calendly'
    });
  }
}
