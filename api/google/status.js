import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { hasGoogleCalendarReadScope } from '../_lib/google-scopes.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('email,last_synced_at,expires_at,refresh_token,access_token,scope')
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[Google Status] Database error:', dbError);
      return res.status(500).json({ error: 'Database error', details: dbError.message });
    }

    if (!integration) {
      return res.status(200).json({ connected: false });
    }

    const hasCalendarPermission = hasGoogleCalendarReadScope(integration.scope);
    const healthError = !integration.access_token
      ? 'GOOGLE_TOKEN_MISSING'
      : !hasCalendarPermission
        ? 'GOOGLE_REVOKED'
        : null;

    return res.status(200).json({
      connected: true,
      email: integration.email,
      last_synced_at: integration.last_synced_at,
      expires_at: integration.expires_at,
      has_refresh_token: Boolean(integration.refresh_token),
      calendar_permission: hasCalendarPermission,
      calendar_permission_error: hasCalendarPermission ? null : 'GOOGLE_CALENDAR_SCOPE_MISSING',
      error: healthError
    });
  } catch (error) {
    console.error('[Google Status] Internal error:', error);
    return res.status(error.status || 500).json({ error: error.status === 401 ? error.message : 'Internal server error' });
  }
}
