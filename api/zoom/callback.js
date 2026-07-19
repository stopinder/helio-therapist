import { getSupabaseClient } from '../_lib/supabase.js';
import { encryptIntegrationToken } from '../_lib/token-crypto.js';
import { findZoomUserId } from '../_lib/zoom-oauth.js';

export default async function handler(req, res) {
  const appUrl = (process.env.APP_URL || 'https://helio-therapist.vercel.app').replace(/\/$/, '');

  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${appUrl}/?zoom=error&message=Missing+OAuth+response`);
    }

    const supabase = getSupabaseClient();
    const { data: saved, error } = await supabase
      .from('oauth_states')
      .select('id,user_id,expires_at,completed_at')
      .eq('id', state)
      .eq('provider', 'zoom')
      .maybeSingle();

    if (error || !saved || saved.completed_at || new Date(saved.expires_at) < new Date()) {
      return res.redirect(`${appUrl}/?zoom=error&message=Security+validation+failed`);
    }

    const clientId = (process.env.ZOOM_CLIENT_ID || '').trim();
    const clientSecret = (process.env.ZOOM_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.ZOOM_REDIRECT_URI || '').trim();

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(`${appUrl}/?zoom=error&message=Zoom+configuration+missing`);
    }

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      return res.redirect(`${appUrl}/?zoom=error&message=Token+exchange+failed`);
    }

    const tokens = await tokenResponse.json();
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Zoom did not return refreshable tokens');
    }

    // Zoom may include the user id in the token response. If not, we make a
    // best-effort /users/me request; lack of the optional scope does not block
    // connection, but the next re-authorisation will complete the account match.
    let zoomUserId = tokens.user_id || tokens.uid || null;
    if (!zoomUserId) {
      try {
        zoomUserId = await findZoomUserId(tokens.access_token);
      } catch {
        zoomUserId = null;
      }
    }

    const integration = {
      user_id: saved.user_id,
      provider: 'zoom',
      access_token: null,
      refresh_token: null,
      encrypted_access_token: encryptIntegrationToken(tokens.access_token),
      encrypted_refresh_token: encryptIntegrationToken(tokens.refresh_token),
      expires_at: tokens.expires_in
        ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
        : null,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || null,
      updated_at: new Date().toISOString()
    };

    if (zoomUserId) integration.provider_account_id = String(zoomUserId);

    const { error: saveError } = await supabase
      .from('integrations')
      .upsert(integration, { onConflict: 'user_id,provider' });

    if (saveError) {
      console.error('[Zoom Callback] save failed', saveError.message);
      return res.redirect(`${appUrl}/?zoom=error&message=Unable+to+save+Zoom+connection`);
    }

    await supabase.from('oauth_states').delete().eq('id', saved.id);
    return res.redirect(`${appUrl}/?zoom=success`);
  } catch (error) {
    console.error('[Zoom Callback]', error.message);
    return res.redirect(`${appUrl}/?zoom=error&message=Internal+server+error`);
  }
}
