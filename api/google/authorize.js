import { serialize } from 'cookie';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();
    
    if (!clientId || !redirectUri || clientId === 'your_google_client_id_here') {
      return res.status(500).json({ 
        error: 'Google configuration missing',
        details: 'Check GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in .env.local'
      });
    }

    // Scopes for Google Calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Generate a random state for security
    const state = crypto.randomBytes(32).toString('hex');
    
    // Sign the state using the service role key (acting as a temporary secret)
    // FUTURE MIGRATION: When Supabase Auth is introduced, use the user's session ID or a proper JWT.
    const hmac = crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY);
    const signature = hmac.update(state).digest('hex');
    const signedState = `${state}.${signature}`;
    
    // Set a secure cookie with the state
    res.setHeader('Set-Cookie', serialize('google_oauth_state', signedState, {
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
