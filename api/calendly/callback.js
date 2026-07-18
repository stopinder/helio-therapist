import { getSupabaseClient } from '../_lib/supabase.js';

function appRedirect(appUrl, params) {
  return `${appUrl}/?${new URLSearchParams(params).toString()}`;
}

export default async function handler(req, res) {
  const appUrl = (process.env.APP_URL || 'https://helio-therapist.vercel.app').replace(/\/$/, '');

  try {
    if (req.query.error) {
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: req.query.error_description || 'Calendly connection was cancelled'
      }));
    }

    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: 'Missing OAuth response'
      }));
    }

    const supabase = getSupabaseClient();
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('id, user_id, pending_credentials, expires_at, completed_at')
      .eq('id', state)
      .eq('provider', 'calendly')
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      oauthState.completed_at ||
      !oauthState.pending_credentials?.code_verifier ||
      new Date(oauthState.expires_at).getTime() < Date.now()
    ) {
      console.error('[Calendly Callback] Invalid, expired, or reused state');
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: 'Security validation failed'
      }));
    }

    const clientId = (process.env.CALENDLY_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CALENDLY_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.CALENDLY_REDIRECT_URI || '').trim();

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: 'Calendly configuration missing'
      }));
    }

    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: oauthState.pending_credentials.code_verifier
      })
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({}));
      console.error('[Calendly Callback] Token exchange failed:', tokenError);
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: 'Token exchange failed'
      }));
    }

    const tokens = await tokenResponse.json();
    const integration = {
      user_id: oauthState.user_id,
      provider: 'calendly',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert(integration, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('[Calendly Callback] Integration upsert failed:', upsertError);
      return res.redirect(appRedirect(appUrl, {
        calendly: 'error',
        message: 'Unable to save Calendly connection'
      }));
    }

    await supabase.from('oauth_states').delete().eq('id', oauthState.id);
    return res.redirect(appRedirect(appUrl, { calendly: 'success' }));
  } catch (error) {
    console.error('[Calendly Callback] Error:', error);
    return res.redirect(appRedirect(appUrl, {
      calendly: 'error',
      message: 'Internal server error'
    }));
  }
}
