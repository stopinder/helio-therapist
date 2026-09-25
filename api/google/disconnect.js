import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { decryptIntegrationToken } from '../_lib/token-crypto.js';

function tokenForRevocation(integration) {
  if (integration?.encrypted_refresh_token) return decryptIntegrationToken(integration.encrypted_refresh_token);
  if (integration?.refresh_token) return integration.refresh_token;
  if (integration?.encrypted_access_token) return decryptIntegrationToken(integration.encrypted_access_token);
  return integration?.access_token || null;
}

export async function revokeGoogleGrant(integration, fetchImpl = fetch) {
  const token = tokenForRevocation(integration);
  if (!token) return;

  const response = await fetchImpl('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString()
  });

  if (response.ok) return;

  const data = await response.json().catch(() => ({}));
  if (response.status === 400 && data?.error === 'invalid_token') return;

  const error = new Error('Unable to revoke Google access. Please try again.');
  error.status = 502;
  throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error: readError } = await supabase
      .from('integrations')
      .select('encrypted_refresh_token,encrypted_access_token,refresh_token,access_token')
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) throw readError;
    if (integration) await revokeGoogleGrant(integration);

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('provider', 'google')
      .eq('user_id', user.id);

    if (error) throw error;
    return res.status(200).json({ connected: false });
  } catch (error) {
    console.error('[Google Disconnect] Error:', error);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
