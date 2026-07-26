import crypto from 'crypto'

export const ZOOM_WEBHOOK_TOLERANCE_SECONDS = 300

function headerValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : String(value || '').trim()
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8')
  const rightBuffer = Buffer.from(String(right || ''), 'utf8')
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function verifyZoomWebhookRequest({
  headers,
  body,
  rawBody,
  secret,
  now = Date.now(),
  toleranceSeconds = ZOOM_WEBHOOK_TOLERANCE_SECONDS
}) {
  const timestamp = headerValue(headers, 'x-zm-request-timestamp')
  const signature = headerValue(headers, 'x-zm-signature')
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return { valid: false, reason: 'missing-or-malformed-signature' }
  }

  const ageSeconds = Math.abs(Math.floor(now / 1000) - Number(timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) {
    return { valid: false, reason: 'stale-timestamp' }
  }

  const serializedBody = rawBody === undefined
    ? Buffer.from(JSON.stringify(body || {}), 'utf8')
    : Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8')
  const expected = `v0=${crypto.createHmac('sha256', secret)
    .update(`v0:${timestamp}:`)
    .update(serializedBody)
    .digest('hex')}`
  if (!safeEqual(signature, expected)) {
    return { valid: false, reason: 'signature-mismatch' }
  }

  return {
    valid: true,
    deliveryKey: crypto.createHash('sha256').update(`${timestamp}:${signature}`).digest('hex')
  }
}

export function safeZoomWebhookPayload(body) {
  const source = body?.payload?.object || {}
  return {
    event: String(body?.event || 'unknown'),
    event_ts: body?.event_ts || null,
    payload: {
      object: {
        id: source.id ? String(source.id) : null,
        uuid: source.uuid ? String(source.uuid) : null,
        host_id: source.host_id ? String(source.host_id) : null,
        recording_files: Array.isArray(source.recording_files)
          ? source.recording_files.map(file => ({
              id: file?.id ? String(file.id) : null,
              file_type: file?.file_type || null,
              file_extension: file?.file_extension || null,
              recording_type: file?.recording_type || null
            }))
          : []
      }
    }
  }
}
