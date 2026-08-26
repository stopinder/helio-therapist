import { getSupabaseClient } from '../_lib/supabase.js';

const RESEND_API = 'https://api.resend.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function syncResendContact(email) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return;

  const request = async (path, options) => fetch(`${RESEND_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const payload = { email, unsubscribed: false };
  let response = await request('/contacts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (response.ok) return;

  const details = await response.text();
  if (!details.toLowerCase().includes('already exists')) {
    throw new Error(`Resend contact sync failed (${response.status})`);
  }

  response = await request(`/contacts/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Resend contact update failed (${response.status})`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = normaliseEmail(req.body?.email);
  const consent = req.body?.marketingConsent === true;
  const source = String(req.body?.source || 'landing').trim().slice(0, 80) || 'landing';

  if (!consent) return res.status(400).json({ error: 'Marketing consent is required' });
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('marketing_leads')
      .upsert({
        email,
        consented_at: now,
        source,
        unsubscribed_at: null,
        updated_at: now
      }, { onConflict: 'email' });

    if (error) throw error;

    try {
      await syncResendContact(email);
    } catch (error) {
      console.error('[Marketing subscribe] Resend sync unavailable', error.message);
    }

    return res.status(200).json({ subscribed: true });
  } catch (error) {
    console.error('[Marketing subscribe]', error.message);
    return res.status(500).json({ error: 'Unable to save your subscription right now' });
  }
}
