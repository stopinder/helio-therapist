import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const webhookIntakeVersion = 'transcript-inbox-v2-single-therapist-fallback';

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { data, error } = await supabase.from('integrations')
      .select('updated_at, encrypted_refresh_token').eq('user_id', user.id).eq('provider', 'zoom').maybeSingle();
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      connected: Boolean(data?.encrypted_refresh_token),
      connected_at: data?.updated_at || null,
      webhook_intake_version: webhookIntakeVersion
    });
  } catch (error) {
    // Deliberately expose only the deployed intake version without sign-in.
    // This is a non-secret operational diagnostic; integration status remains private.
    if (error.status === 401) {
      return res.status(200).json({ webhook_intake_version: webhookIntakeVersion });
    }
    return res.status(500).json({ error: 'Unable to check Zoom connection' });
  }
}
