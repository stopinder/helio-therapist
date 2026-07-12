export default async function handler(req, res) {
  const { code, state } = req.query;
  
  // 1. Validate state (should match the one generated in /authorize)
  // 2. Exchange code for tokens
  // 3. Store tokens securely (Supabase)
  
  // For Phase 1/2 Personal Test:
  // We'll simulate success and redirect back to settings
  
  console.log('Zoom callback received code:', code);
  
  // In a real flow, we'd do the POST to https://zoom.us/oauth/token here
  
  // Redirect back to Settings with a success flag
  res.redirect('/?zoom=success');
}
