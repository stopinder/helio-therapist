import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const state = req.body?.state;
    if (!state) {
      return res.status(400).json({ error: 'OAuth state is required' });
    }

    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('id', state)
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      stateError ||
      !oauthState ||
      !oauthState.completed_at ||
      !oauthState.pending_credentials ||
      new Date(oauthState.expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({ error: 'Google connection could not be verified' });
    }

    const tokens = oauthState.pending_credentials;
    const integration = {
      user_id: user.id,
      provider: 'google',
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
      console.error('[Google Complete] Integration upsert failed:', upsertError);
      return res.status(500).json({ error: 'Unable to save Google connection' });
    }

    await supabase.from('oauth_states').delete().eq('id', oauthState.id);
    return res.status(200).json({ connected: true });
  } catch (error) {
    console.error('[Google Complete] Error:', error);
    return res.status(error.status || 500).json({ error: error.message });
  }
}
