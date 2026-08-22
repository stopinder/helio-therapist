import { getSupabaseClient } from '../_lib/supabase.js';

const RESEND_API = 'https://api.resend.com';
const DEFAULT_FROM = 'Helios <hello@helio.works>';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function resendRequest(path, options = {}) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const response = await fetch(`${RESEND_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Resend request failed (${response.status})`);
    error.details = body.slice(0, 500);
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

async function syncContact({ email, fullName, subscribed }) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  const payload = {
    email,
    first_name: firstName || undefined,
    last_name: rest.join(' ') || undefined,
    unsubscribed: !subscribed
  };

  try {
    await resendRequest('/contacts', { method: 'POST', body: JSON.stringify(payload) });
  } catch (error) {
    if (!String(error.details || '').toLowerCase().includes('already exists')) throw error;
    await resendRequest(`/contacts/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
}

async function sendWelcome({ email, fullName, userId }) {
  const firstName = fullName.trim().split(/\s+/)[0] || 'there';
  const safeName = escapeHtml(firstName);
  const from = (process.env.RESEND_FROM_EMAIL || DEFAULT_FROM).trim();

  await resendRequest('/emails', {
    method: 'POST',
    headers: { 'Idempotency-Key': `helios-welcome-${userId}` },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Welcome to Helios',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.6"><h1 style="font-size:26px">Welcome to Helios, ${safeName}</h1><p>Your therapist workspace is ready to set up.</p><p>Once you confirm your email and sign in, start by adding your practice details, then connect Google Calendar and Zoom when you are ready.</p><p><a href="https://helio.works/sign-in" style="color:#3157d5">Open Helios</a></p><p style="color:#667085;font-size:14px">This is an account email from Helios. Marketing emails are controlled separately by the preference you selected when signing up.</p></div>`,
      text: `Welcome to Helios, ${firstName}.\n\nYour therapist workspace is ready to set up. Once you confirm your email and sign in, start by adding your practice details, then connect Google Calendar and Zoom when you are ready.\n\nOpen Helios: https://helio.works/sign-in\n\nThis is an account email from Helios. Marketing emails are controlled separately by the preference you selected when signing up.`
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = String(req.body?.userId || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!userId || !email) return res.status(400).json({ error: 'Missing signup details' });

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user || data.user.email?.toLowerCase() !== email) {
      return res.status(202).json({ accepted: true });
    }

    const createdAt = Date.parse(data.user.created_at || '');
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 10 * 60 * 1000) {
      return res.status(202).json({ accepted: true });
    }

    const fullName = String(data.user.user_metadata?.full_name || '').trim();
    const subscribed = data.user.user_metadata?.marketing_email_consent === true;

    await syncContact({ email, fullName, subscribed });
    await sendWelcome({ email, fullName, userId });

    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('[Signup welcome]', error.message, error.details || '');
    return res.status(202).json({ accepted: true });
  }
}
