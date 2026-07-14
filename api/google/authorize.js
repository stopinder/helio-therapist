export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google configuration missing' });
  }

  // Scopes for Google Calendar
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // In a real implementation, we would store this state in a secure cookie or session
  
  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent`;
  
  res.redirect(googleUrl);
}
