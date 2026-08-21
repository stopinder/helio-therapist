import { requireAuthenticatedUser } from '../_lib/supabase.js';

const MY_NOTES_SCOPE = 'my_notes:read:content';

function hasScope(scopeValue, requiredScope) {
  return String(scopeValue || '').split(/\s+/).filter(Boolean).includes(requiredScope);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const webhookIntakeVersion = 'transcript-inbox-v3-my-notes';

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data, error } = await supabase.from('integrations')
      .select('updated_at, encrypted_refresh_token, provider_account_id, scope').eq('user_id', user.id).eq('provider', 'zoom').maybeSingle();
    if (error) throw error;
    const hasCredentials = Boolean(data?.encrypted_refresh_token);
    const accountMatched = Boolean(data?.provider_account_id);
    const connected = hasCredentials && accountMatched;
    const myNotesReady = connected && hasScope(data?.scope, MY_NOTES_SCOPE);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      connected,
      reconnect_required: hasCredentials && (!accountMatched || !myNotesReady),
      my_notes_ready: myNotesReady,
      connected_at: data?.updated_at || null,
      webhook_intake_version: webhookIntakeVersion
    });
  } catch (error) {
    if (error.status === 401) return res.status(200).json({ webhook_intake_version: webhookIntakeVersion });
    return res.status(500).json({ error: 'Unable to check Zoom connection' });
  }
}
