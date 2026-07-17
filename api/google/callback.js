import { getSupabaseClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const appUrl = (process.env.APP_URL || 'https://helio-therapist.vercel.app').replace(/\/$/, '');

  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${appUrl}/?google=error&message=Missing+OAuth+response`);
    }

    const supabase = getSupabaseClient();
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('id, user_id, expires_at, completed_at')
      .eq('id', state)
      .eq('provider', 'google')
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      oauthState.completed_at ||
      new Date(oauthState.expires_at).getTime() < Date.now()
    ) {
      console.error('[Google Callback] Invalid, expired, or reused state');
      return res.redirect(`${appUrl}/?google=error&message=Security+validation+failed`);
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(`${appUrl}/?google=error&message=Google+configuration+missing`);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({}));
      console.error('[Google Callback] Token exchange failed:', tokenError);
      return res.redirect(`${appUrl}/?google=error&message=Token+exchange+failed`);
    }

    const tokens = await tokenResponse.json();
    const { error: updateError } = await supabase
      .from('oauth_states')
      .update({
        pending_credentials: tokens,
        completed_at: new Date().toISOString()
      })
      .eq('id', oauthState.id)
      .is('completed_at', null);

    if (updateError) {
      console.error('[Google Callback] Failed to stage credentials:', updateError);
      return res.redirect(`${appUrl}/?google=error&message=Unable+to+save+Google+connection`);
    }

    return res.redirect(`${appUrl}/?google=complete&state=${encodeURIComponent(state)}`);
  } catch (error) {
    console.error('[Google Callback] Error:', error);
    return res.redirect(`${appUrl}/?google=error&message=Internal+server+error`);
  }
}
