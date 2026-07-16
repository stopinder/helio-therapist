import * as cookie from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const stateSecret = (process.env.OAUTH_STATE_SECRET || serviceKey || '').trim();
    
    if (!clientId || clientId === 'your_google_client_id_here') {
      console.error('[Google Authorize] Missing GOOGLE_CLIENT_ID');
      return res.status(500).json({ 
        error: 'Google configuration missing',
        details: 'GOOGLE_CLIENT_ID is not configured.'
      });
    }

    if (!redirectUri) {
      console.error('[Google Authorize] Missing GOOGLE_REDIRECT_URI');
      return res.status(500).json({ 
        error: 'Google configuration missing',
        details: 'GOOGLE_REDIRECT_URI is not configured.'
      });
    }

    if (!serviceKey) {
      console.error('[Google Authorize] Missing SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'SUPABASE_SERVICE_ROLE_KEY is missing.'
      });
    }

    if (!stateSecret) {
      console.error('[Google Authorize] Missing OAUTH_STATE_SECRET');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'OAUTH_STATE_SECRET is missing.'
      });
    }

    // Scopes for Google Calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Generate a random state for security
    const state = crypto.randomBytes(32).toString('hex');
    
    // Sign the state using the state secret
    // FUTURE MIGRATION: When Supabase Auth is introduced, use the user's session ID or a proper JWT.
    const hmac = crypto.createHmac('sha256', stateSecret);
    const signature = hmac.update(state).digest('hex');
    const signedState = `${state}.${signature}`;
    
    // Set a secure cookie with the state
    res.setHeader('Set-Cookie', cookie.serialize('google_oauth_state', signedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10 // 10 minutes
    }));
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state: signedState,
      access_type: 'offline',
      prompt: 'consent',
    });

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    res.redirect(302, googleUrl);
  } catch (error) {
    console.error('[Google Authorize] Fatal error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
