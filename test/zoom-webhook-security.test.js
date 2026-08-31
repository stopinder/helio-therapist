import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import fs from 'node:fs'
import { canonicaliseMyNotesTranscript, myNotesEvent, safeZoomWebhookPayload, schedulerAppointmentEvent, verifyZoomWebhookRequest } from '../api/_lib/zoom-webhook.js'

const secret = 'test-webhook-secret'
const timestamp = '1785067200'
const now = Number(timestamp) * 1000
const body = { event: 'recording.completed', event_ts: Number(timestamp) * 1000, payload: { object: { id: 12345, uuid: 'meeting-uuid', host_id: 'host-id', recording_files: [{ id: 'file-id', file_type: 'TRANSCRIPT', file_extension: 'VTT', download_url: 'https://zoom.example/download?access_token=must-not-be-stored' }] } } }
function signatureFor(value = JSON.stringify(body), at = timestamp) { return `v0=${crypto.createHmac('sha256', secret).update(`v0:${at}:`).update(value).digest('hex')}` }

test('accepts a current Zoom webhook with a matching signature', () => {
  const result = verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now })
  assert.equal(result.valid, true); assert.match(result.deliveryKey, /^[a-f0-9]{64}$/)
})

test('rejects missing, mismatched and stale Zoom webhook signatures', () => {
  assert.equal(verifyZoomWebhookRequest({ headers: {}, body, secret, now }).valid, false)
  assert.equal(verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': 'v0=wrong' }, body, secret, now }).reason, 'signature-mismatch')
  assert.equal(verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now: now + 301_000 }).reason, 'stale-timestamp')
})

test('verifies the exact raw Zoom payload without reserialising JSON', () => {
  const rawBody = JSON.stringify(body, null, 2)
  assert.equal(verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor(rawBody) }, body, rawBody, secret, now }).valid, true)
  assert.equal(verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor(rawBody) }, body, secret, now }).valid, false)
})

test('uses a stable delivery key and stores only bounded recording metadata', () => {
  const first = verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now })
  const replay = verifyZoomWebhookRequest({ headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now })
  const safePayload = safeZoomWebhookPayload(body)
  assert.equal(first.deliveryKey, replay.deliveryKey); assert.equal(safePayload.payload.object.recording_files[0].download_url, undefined); assert.doesNotMatch(JSON.stringify(safePayload), /access_token/)
})

test('requires explicit Zoom account ownership and has no single-therapist fallback', () => {
  const webhookSource = fs.readFileSync(new URL('../api/zoom/webhook.js', import.meta.url), 'utf8')
  assert.match(webhookSource, /\.eq\('provider_account_id', hostId\)/)
  assert.match(webhookSource, /\.eq\('provider_account_id', noteEvent\.operatorId\)/)
  assert.doesNotMatch(webhookSource, /single-therapist MVP account fallback|zoomIntegrations\?\.length === 1/)
})

test('acknowledges durable webhook intake before expensive Zoom processing', () => {
  const webhookSource = fs.readFileSync(new URL('../api/zoom/webhook.js', import.meta.url), 'utf8')
  const acknowledgement = webhookSource.indexOf("res.status(200).json({ received: true });")
  const processing = webhookSource.indexOf('processAcceptedWebhook(')
  assert.ok(acknowledgement >= 0)
  assert.ok(processing >= 0)
  assert.ok(processing < acknowledgement)
  assert.match(webhookSource, /waitUntil\(processing\)/)
  assert.match(webhookSource, /Intake failed before acknowledgement/)
  assert.match(webhookSource, /Background processing failed/)
})

test('sanitises My Notes webhook payload without storing note content', () => {
  const noteBody = { event: 'my_notes.note_generated', event_ts: 1, payload: { account_id: 'account', operator_id: 'operator', object: { note_id: 'note-1', note_name: 'Private session title', created_time: '2026-08-21T10:00:00Z', updated_time: '2026-08-21T10:05:00Z', meeting_id: '123456789', content: 'must not be stored' } } }
  assert.deepEqual(myNotesEvent(noteBody), { noteId: 'note-1', noteName: 'Private session title', operatorId: 'operator', accountId: 'account', meetingId: '123456789', createdTime: '2026-08-21T10:00:00Z', updatedTime: '2026-08-21T10:05:00Z' })
  const safePayload = safeZoomWebhookPayload(noteBody)
  const serialized = JSON.stringify(safePayload)
  // Security boundary: title metadata may be retained; note content must not be stored in webhook intake
  assert.match(serialized, /Private session title/)
  assert.doesNotMatch(serialized, /must not be stored/)
  assert.match(serialized, /note-1/)
})

test('canonicalises My Notes transcript with speaker labels and fallback labels', () => {
  const text = canonicaliseMyNotesTranscript({ speakers: [{ speaker_id: '1', display_name: 'Therapist' }], items: [{ speaker_id: '1', start_time: '00:00:01.000', text: 'Hello' }, { speaker_id: '2', start_time: '00:00:03.000', text: 'Hi' }] })
  assert.match(text, /\[00:00:01\.000\] Therapist: Hello/)
  assert.match(text, /\[00:00:03\.000\] Speaker 2: Hi/)
})

test('extracts Scheduler booking lifecycle data from the opaque correlation token', () => {
  const schedulerBody = { event: 'scheduler.scheduled_event_created', event_ts: 1786263000000, payload: { object: { time_zone: 'Europe/Madrid', rescheduled: false, tracking: { utm_content: 'opaque-correlation-token', utm_source: 'helio' }, attendee: { name: 'must not be stored', email: 'private@example.com' }, scheduled_event: { event_id: 'scheduler-event-id', start_date_time: '2026-08-10T10:00:00Z', end_date_time: '2026-08-10T11:00:00Z', location_kind: 'zoom', external_location: { kind: 'zoom', meeting_id: '987654321', join_url: 'https://zoom.us/private' } } } } }
  assert.deepEqual(schedulerAppointmentEvent(schedulerBody), { eventType: 'scheduler.scheduled_event_created', eventId: 'scheduler-event-id', meetingId: '987654321', startsAt: '2026-08-10T10:00:00Z', endsAt: '2026-08-10T11:00:00Z', timezone: 'Europe/Madrid', correlationToken: 'opaque-correlation-token', rescheduled: false, status: 'scheduled' })
  const serialized = JSON.stringify(safeZoomWebhookPayload(schedulerBody)); assert.match(serialized, /opaque-correlation-token/); assert.doesNotMatch(serialized, /private@example.com|must not be stored|join_url/)
})

test('maps Scheduler cancellation and reschedule lifecycle states', () => {
  assert.equal(schedulerAppointmentEvent({ event: 'scheduler.scheduled_event_canceled', payload: { object: { tracking: { utm_content: 'token' }, scheduled_event: { event_id: 'event' } } } }).status, 'cancelled')
  assert.equal(schedulerAppointmentEvent({ event: 'scheduler.scheduled_event_created', payload: { object: { rescheduled: true, tracking: { utm_content: 'token' }, scheduled_event: { event_id: 'event' } } } }).status, 'rescheduled')
})
