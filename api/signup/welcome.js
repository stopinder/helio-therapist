import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { heliosWelcomeEmail } from '../_lib/emails/heliosWelcomeEmail.js';

const RESEND_API = 'https://api.resend.com';
const LOOPS_API = 'https://app.loops.so/api/v1';
const DEFAULT_FROM = 'Helios <hello@helio.works>';
const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

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

async function loopsRequest(path, options = {}) {
  const apiKey = (process.env.LOOPS_API_KEY || '').trim();
  if (!apiKey) return; // Non-blocking if API key is missing

  try {
    const response = await fetch(`${LOOPS_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[Loops sync] Request failed (${response.status}):`, body.slice(0, 500));
    }
  } catch (error) {
    console.warn('[Loops sync] Network error:', error.message);
  }
}

async function syncLoopsMarketing({ email, fullName, userId, signupDate }) {
  const firstName = fullName.trim().split(/\s+/)[0] || '';
  
  // Send event which also creates/updates the contact
  await loopsRequest('/events/send', {
    method: 'POST',
    body: JSON.stringify({
      email,
      userId,
      eventName: 'marketing_consent_granted',
      firstName,
      signupDate,
      subscribed: true
    })
  });
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
  const from = (process.env.RESEND_FROM_EMAIL || DEFAULT_FROM).trim();
  const { subject, html, text } = heliosWelcomeEmail({ firstName });

  await resendRequest('/emails', {
    method: 'POST',
    headers: { 'Idempotency-Key': `helios-welcome-${userId}` },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html,
      text
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user } = await requireAuthenticatedUser(req);
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) return res.status(202).json({ accepted: true });

    const createdAt = Date.parse(user.created_at || '');
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > WELCOME_WINDOW_MS) {
      return res.status(202).json({ accepted: true });
    }

    const fullName = String(user.user_metadata?.full_name || '').trim();
    const subscribed = user.user_metadata?.marketing_email_consent === true;

    if (subscribed) {
      await syncLoopsMarketing({
        email,
        fullName,
        userId: user.id,
        signupDate: user.created_at
      });
    }

    await syncContact({ email, fullName, subscribed });
    await sendWelcome({ email, fullName, userId: user.id });

    return res.status(200).json({ sent: true });
  } catch (error) {
    if (error.status === 401) return res.status(401).json({ error: 'Authentication required' });
    console.error('[Signup welcome]', error.message, error.details || '');
    return res.status(202).json({ accepted: true });
  }
}
