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

    // 2. Store in Supabase integrations table
    // FUTURE MIGRATION: Link this to a user_id when Supabase Auth is added.
    const integrationData = {
      provider: 'google',
      credentials: tokens,
      last_synced_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert(integrationData, { onConflict: 'provider' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      const msg = encodeURIComponent(upsertError.message || 'Database storage failed');
      return res.redirect(`/?google=error&message=${msg}`);
    }
    
    // Redirect back to Settings with a success flag
    res.redirect(`/?google=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    const msg = encodeURIComponent(error.message || 'Internal server error');
    res.redirect(`/?google=error&message=${msg}`);
  }
}
