import crypto from 'crypto';

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = (process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '').trim();
  if (!secret) {
    console.error('[Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN is not configured');
    return res.status(503).json({ error: 'Webhook configuration missing' });
  }

  const body = getBody(req);

  // Zoom calls this once when you save the endpoint in the Marketplace.
  // It proves that Helio controls this URL without exposing the secret.
  if (body.event === 'endpoint.url_validation') {
    const plainToken = body.payload?.plainToken;
    if (!plainToken) {
      return res.status(400).json({ error: 'Missing Zoom validation token' });
    }

    const encryptedToken = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    return res.status(200).json({ plainToken, encryptedToken });
  }

  // This endpoint deliberately does not store transcript or client data yet.
  // The next step will safely match a completed recording to the correct Helio client.
  const recording = body.payload?.object || {};
  console.info('[Zoom Webhook] Event received', {
    event: body.event || 'unknown',
    meetingId: recording.id || null,
    recordingFiles: Array.isArray(recording.recording_files)
      ? recording.recording_files.length
      : 0
  });

  return res.status(200).json({ received: true });
}
