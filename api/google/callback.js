import { supabase } from '../_lib/supabase.js';
import { parse } from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    
    // Check for required environment variables
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!serviceKey) {
      console.error('[Google Callback] Missing SUPABASE_SERVICE_ROLE_KEY');
      return res.redirect('/?google=error&message=Server+configuration+error');
    }

    if (!supabase) {
      console.error('[Google Callback] Supabase client not initialized');
      return res.redirect('/?google=error&message=Database+connection+failed');
    }

    const cookies = parse(req.headers.cookie || '');
    const storedState = cookies.google_oauth_state;

    // 0. Validate state (CSRF protection)
    if (!state || state !== storedState) {
      console.error('State mismatch or missing');
      return res.redirect('/?google=error&message=Security+validation+failed');
    }

    // Verify the signature of the state
    const [value, signature] = state.split('.');
    const hmac = crypto.createHmac('sha256', serviceKey);
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
        client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
        client_secret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
        redirect_uri: (process.env.GOOGLE_REDIRECT_URI || '').trim(),
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

    // 2. Fetch user email for display
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    let email = 'Connected';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      email = userData.email;
    }

    // 3. Store in Supabase integrations table
    // FUTURE MIGRATION: Link this to a user_id when Supabase Auth is added.
    const { error: upsertError } = await supabase.from('integrations').upsert({
      provider: 'google',
      email: email,
      credentials: tokens,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'provider' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      const msg = encodeURIComponent(upsertError.message || 'Database storage failed');
      return res.redirect(`/?google=error&message=${msg}`);
    }
    
    // Redirect back to Settings with a success flag and email
    res.redirect(`/?google=success&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Google callback error:', error);
    const msg = encodeURIComponent(error.message || 'Internal server error');
    res.redirect(`/?google=error&message=${msg}`);
  }
}
