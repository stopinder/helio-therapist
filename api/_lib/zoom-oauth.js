import { decryptIntegrationToken, encryptIntegrationToken } from './token-crypto.js';

const REFRESH_SKEW_MS = 5 * 60 * 1000;

function basicCredentials() {
  const clientId = (process.env.ZOOM_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ZOOM_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) throw new Error('Zoom OAuth configuration is missing');
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

export function isZoomTokenExpiring(expiresAt, now = Date.now()) {
  const expires = expiresAt ? new Date(expiresAt).getTime() : 0;
  return !Number.isFinite(expires) || expires <= now + REFRESH_SKEW_MS;
}

export async function refreshZoomAccessToken(supabase, integration) {
  if (!integration.encrypted_refresh_token) {
    throw new Error('Zoom connection needs to be reconnected');
  }

  const refreshToken = decryptIntegrationToken(integration.encrypted_refresh_token);
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  });

  if (!response.ok) throw new Error(`Zoom token refresh failed with ${response.status}`);

  const tokens = await response.json();
  if (!tokens.access_token) throw new Error('Zoom did not return an access token');

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : integration.expires_at;

  const update = {
    encrypted_access_token: encryptIntegrationToken(tokens.access_token),
    expires_at: expiresAt,
    token_type: tokens.token_type || integration.token_type || 'Bearer',
    scope: tokens.scope || integration.scope || null,
    updated_at: new Date().toISOString()
  };

  if (tokens.refresh_token) {
    update.encrypted_refresh_token = encryptIntegrationToken(tokens.refresh_token);
  }

  const { error } = await supabase
    .from('integrations')
    .update(update)
    .eq('user_id', integration.user_id)
    .eq('provider', 'zoom');

  if (error) throw new Error('Unable to save refreshed Zoom credentials');

  return { accessToken: tokens.access_token, expiresAt, refreshed: true };
}

export async function getZoomAccessTokenContext(supabase, integration, { forceRefresh = false } = {}) {
  if (!forceRefresh && integration.encrypted_access_token && !isZoomTokenExpiring(integration.expires_at)) {
    return {
      accessToken: decryptIntegrationToken(integration.encrypted_access_token),
      expiresAt: integration.expires_at || null,
      refreshed: false
    };
  }

  return refreshZoomAccessToken(supabase, integration);
}

// Backwards-compatible helper for existing callers.
export async function getUsableZoomAccessToken(supabase, integration) {
  return (await getZoomAccessTokenContext(supabase, integration)).accessToken;
}

export async function findZoomUserId(accessToken) {
  const response = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user.id || null;
}
