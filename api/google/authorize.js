export default async function handler(req, res) {
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
  const state = Math.random().toString(36).substring(2, 15);
  
  // In a real implementation, we would store this state in a secure cookie or session
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  
  res.redirect(302, googleUrl);
}
