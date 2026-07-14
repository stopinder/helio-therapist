import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const { code, state } = req.query;
  
  if (!code) {
    return res.redirect('/?google=error&message=No+code+provided');
  }

  try {
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
      const errorData = await tokenResponse.json();
      console.error('Google token exchange failed:', errorData);
      return res.redirect('/?google=error&message=Token+exchange+failed');
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
    // We store the whole token object (access_token, refresh_token, expiry, etc.)
    const { error: upsertError } = await supabase.from('integrations').upsert({
      provider: 'google',
      email: email,
      credentials: tokens,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'provider' });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return res.redirect('/?google=error&message=Database+storage+failed');
    }

    console.log('Google integration successful for:', email);
    
    // Redirect back to Settings with a success flag and email
    res.redirect(`/?google=success&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect('/?google=error&message=Internal+server+error');
  }
}
