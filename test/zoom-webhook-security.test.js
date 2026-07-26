import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { safeZoomWebhookPayload, verifyZoomWebhookRequest } from '../api/_lib/zoom-webhook.js'

const secret = 'test-webhook-secret'
const timestamp = '1785067200'
const now = Number(timestamp) * 1000
const body = {
  event: 'recording.completed',
  event_ts: Number(timestamp) * 1000,
  payload: {
    object: {
      id: 12345,
      uuid: 'meeting-uuid',
      host_id: 'host-id',
      recording_files: [{
        id: 'file-id',
        file_type: 'TRANSCRIPT',
        file_extension: 'VTT',
        download_url: 'https://zoom.example/download?access_token=must-not-be-stored'
      }]
    }
  }
}

function signatureFor(value = JSON.stringify(body), at = timestamp) {
  return `v0=${crypto.createHmac('sha256', secret).update(`v0:${at}:`).update(value).digest('hex')}`
}

test('accepts a current Zoom webhook with a matching signature', () => {
  const result = verifyZoomWebhookRequest({
    headers: {
      'x-zm-request-timestamp': timestamp,
      'x-zm-signature': signatureFor()
    },
    body,
    secret,
    now
  })

  assert.equal(result.valid, true)
  assert.match(result.deliveryKey, /^[a-f0-9]{64}$/)
})

test('rejects missing, mismatched and stale Zoom webhook signatures', () => {
  assert.equal(verifyZoomWebhookRequest({ headers: {}, body, secret, now }).valid, false)
  assert.equal(verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': 'v0=wrong' },
    body,
    secret,
    now
  }).reason, 'signature-mismatch')
  assert.equal(verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() },
    body,
    secret,
    now: now + 301_000
  }).reason, 'stale-timestamp')
})

test('verifies the exact raw Zoom payload without reserialising JSON', () => {
  const rawBody = JSON.stringify(body, null, 2)
  const result = verifyZoomWebhookRequest({
    headers: {
      'x-zm-request-timestamp': timestamp,
      'x-zm-signature': signatureFor(rawBody)
    },
    body,
    rawBody,
    secret,
    now
  })

  assert.equal(result.valid, true)
  assert.equal(verifyZoomWebhookRequest({
    headers: {
      'x-zm-request-timestamp': timestamp,
      'x-zm-signature': signatureFor(rawBody)
    },
    body,
    secret,
    now
  }).valid, false)
})

test('uses a stable delivery key and stores only bounded webhook metadata', () => {
  const first = verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() },
    body,
    secret,
    now
  })
  const replay = verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() },
    body,
    secret,
    now
  })
  const safePayload = safeZoomWebhookPayload(body)

  assert.equal(first.deliveryKey, replay.deliveryKey)
  assert.equal(safePayload.payload.object.recording_files[0].download_url, undefined)
  assert.doesNotMatch(JSON.stringify(safePayload), /access_token/)
})
