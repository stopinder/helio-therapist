export default async function handler(req, res) {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Zoom configuration missing' });
  }

  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15);
  
  // In a real implementation, we would store this state in a secure cookie or session
  // For this local test, we'll just redirect.
  
  const zoomUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  res.redirect(zoomUrl);
}
