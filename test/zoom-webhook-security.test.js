import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { safeZoomWebhookPayload, schedulerAppointmentEvent, verifyZoomWebhookRequest } from '../api/_lib/zoom-webhook.js'

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
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() },
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
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': 'v0=wrong' }, body, secret, now
  }).reason, 'signature-mismatch')
  assert.equal(verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() },
    body, secret, now: now + 301_000
  }).reason, 'stale-timestamp')
})

test('verifies the exact raw Zoom payload without reserialising JSON', () => {
  const rawBody = JSON.stringify(body, null, 2)
  const result = verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor(rawBody) },
    body, rawBody, secret, now
  })
  assert.equal(result.valid, true)
  assert.equal(verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor(rawBody) },
    body, secret, now
  }).valid, false)
})

test('uses a stable delivery key and stores only bounded recording metadata', () => {
  const first = verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now
  })
  const replay = verifyZoomWebhookRequest({
    headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signatureFor() }, body, secret, now
  })
  const safePayload = safeZoomWebhookPayload(body)
  assert.equal(first.deliveryKey, replay.deliveryKey)
  assert.equal(safePayload.payload.object.recording_files[0].download_url, undefined)
  assert.doesNotMatch(JSON.stringify(safePayload), /access_token/)
})

test('extracts Scheduler booking lifecycle data from the opaque correlation token', () => {
  const schedulerBody = {
    event: 'scheduler.scheduled_event_created',
    event_ts: 1786263000000,
    payload: {
      object: {
        time_zone: 'Europe/Madrid',
        rescheduled: false,
        tracking: { utm_content: 'opaque-correlation-token', utm_source: 'helio' },
        attendee: { name: 'must not be stored', email: 'private@example.com' },
        scheduled_event: {
          event_id: 'scheduler-event-id',
          start_date_time: '2026-08-10T10:00:00Z',
          end_date_time: '2026-08-10T11:00:00Z',
          location_kind: 'zoom',
          external_location: { kind: 'zoom', meeting_id: '987654321', join_url: 'https://zoom.us/private' }
        }
      }
    }
  }

  assert.deepEqual(schedulerAppointmentEvent(schedulerBody), {
    eventType: 'scheduler.scheduled_event_created',
    eventId: 'scheduler-event-id',
    meetingId: '987654321',
    startsAt: '2026-08-10T10:00:00Z',
    endsAt: '2026-08-10T11:00:00Z',
    timezone: 'Europe/Madrid',
    correlationToken: 'opaque-correlation-token',
    rescheduled: false,
    status: 'scheduled'
  })

  const safePayload = safeZoomWebhookPayload(schedulerBody)
  const serialized = JSON.stringify(safePayload)
  assert.match(serialized, /opaque-correlation-token/)
  assert.doesNotMatch(serialized, /private@example.com|must not be stored|join_url/)
})

test('maps Scheduler cancellation and reschedule lifecycle states', () => {
  const cancelled = schedulerAppointmentEvent({
    event: 'scheduler.scheduled_event_canceled',
    payload: { object: { tracking: { utm_content: 'token' }, scheduled_event: { event_id: 'event' } } }
  })
  assert.equal(cancelled.status, 'cancelled')

  const rescheduled = schedulerAppointmentEvent({
    event: 'scheduler.scheduled_event_created',
    payload: { object: { rescheduled: true, tracking: { utm_content: 'token' }, scheduled_event: { event_id: 'event' } } }
  })
  assert.equal(rescheduled.status, 'rescheduled')
})

test('extracts My Notes metadata without storing transcript content', () => {
  const myNotesBody = {
    event: 'my_notes.note_generated',
    event_ts: 1786263000000,
    payload: {
      operator_id: 'zoom-operator-id',
      operator: 'Therapist Name',
      account_id: 'account-id',
      object: {
        note_id: 'note-id-123',
        note_name: 'Therapy Session Note',
        created_time: '2026-08-10T10:00:00Z',
        updated_time: '2026-08-10T10:05:00Z',
        meeting_id: '987654321',
        generated_note_content: 'AI summary should not be stored'
      }
    }
  }

  const safePayload = safeZoomWebhookPayload(myNotesBody)
  const serialized = JSON.stringify(safePayload)

  assert.equal(safePayload.event, 'my_notes.note_generated')
  assert.equal(safePayload.payload.operator_id, 'zoom-operator-id')
  assert.equal(safePayload.payload.object.note_id, 'note-id-123')
  assert.equal(safePayload.payload.object.meeting_id, '987654321')
  assert.doesNotMatch(serialized, /AI summary should not be stored|Therapist Name/)
})
