import { getSupabaseClient } from '../_lib/supabase.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    
    // Check for required environment variables
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();
    
    // Initialize Supabase
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err) {
      console.error('[Google Callback] Supabase initialization failed:', err.message);
      return res.redirect(`/?google=error&message=${encodeURIComponent(err.message)}`);
    }

    const stateSecret = (process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!stateSecret) {
      console.error('[Google Callback] Missing OAUTH_STATE_SECRET');
      return res.redirect('/?google=error&message=Server+configuration+error');
    }

    if (!clientId) {
      console.error('[Google Callback] Missing GOOGLE_CLIENT_ID');
      return res.redirect('/?google=error&message=Google+configuration+missing');
    }

    if (!clientSecret) {
      console.error('[Google Callback] Missing GOOGLE_CLIENT_SECRET');
      return res.redirect('/?google=error&message=Google+configuration+missing');
    }

    if (!redirectUri) {
      console.error('[Google Callback] Missing GOOGLE_REDIRECT_URI');
      return res.redirect('/?google=error&message=Google+configuration+missing');
    }

    const cookieHeader = req.headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach(c => {
      const [key, ...v] = c.trim().split('=');
      if (key) cookies[key] = v.join('=');
    });
    const storedState = cookies.google_oauth_state ? decodeURIComponent(cookies.google_oauth_state) : undefined;

    // 0. Validate state (CSRF protection)
    if (!state || state !== storedState) {
      console.error('State mismatch or missing');
      return res.redirect('/?google=error&message=Security+validation+failed');
    }

    // Verify the signature of the state
    const [value, signature] = state.split('.');
    const hmac = crypto.createHmac('sha256', stateSecret);
    const expectedSignature = hmac.update(value).digest('hex');

    if (signature !== expectedSignature) {
      console.error('State signature invalid');
      return res.redirect('/?google=error&message=Security+validation+failed');
    }
    
    if (!code) {
      return res.redirect('/?google=error&message=No+code+provided');
    }

    // 1. Exchange code for tokens
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
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Google token exchange failed:', errorData);
      const msg = encodeURIComponent(errorData.error_description || errorData.error || 'Token exchange failed');
      return res.redirect(`/?google=error&message=${msg}`);
    }

    const tokens = await tokenResponse.json();
    console.log('[Google Callback] Tokens received');

    // 2. Store in Supabase integrations table
    // Match the flat schema identified: access_token, refresh_token, expires_at, etc.
    const integrationData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Temporary placeholder for required UUID
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    };

    console.log('[Google Callback] Upserting to Supabase:', JSON.stringify({ ...integrationData, access_token: 'REDACTED', refresh_token: 'REDACTED' }));

    const { data: upsertData, error: upsertError } = await supabase
      .from('integrations')
      .upsert(integrationData, { onConflict: 'provider' })
      .select();

    if (upsertError) {
      console.error('[Google Callback] Supabase upsert error:', JSON.stringify(upsertError));
      // Fallback: Try a minimal upsert if the schema is strictly id/user_id/provider/credentials
      console.log('[Google Callback] Retrying with legacy schema');
      const legacyData = {
        provider: 'google',
        credentials: tokens,
        last_synced_at: new Date().toISOString()
      };
      const { error: legacyError } = await supabase
        .from('integrations')
        .upsert(legacyData, { onConflict: 'provider' });

      if (legacyError) {
        const msg = encodeURIComponent(upsertError.message || legacyError.message || 'Database storage failed');
        return res.redirect(`/?google=error&message=${msg}`);
      }
    }
    
    // Redirect back to Settings with a success flag
    res.redirect(`/?google=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    const msg = encodeURIComponent(error.message || 'Internal server error');
    res.redirect(`/?google=error&message=${msg}`);
  }
}
