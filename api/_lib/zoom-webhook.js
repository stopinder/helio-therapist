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

export function schedulerAppointmentEvent(body) {
  const eventType = String(body?.event || '')
  if (eventType !== 'scheduler.scheduled_event_created' && eventType !== 'scheduler.scheduled_event_canceled') {
    return null
  }

  const object = body?.payload?.object || {}
  const scheduledEvent = object?.scheduled_event || {}
  const tracking = object?.tracking || {}
  const externalLocation = scheduledEvent?.external_location || {}

  return {
    eventType,
    eventId: scheduledEvent?.event_id ? String(scheduledEvent.event_id) : null,
    meetingId: externalLocation?.meeting_id ? String(externalLocation.meeting_id) : null,
    startsAt: scheduledEvent?.start_date_time || null,
    endsAt: scheduledEvent?.end_date_time || null,
    timezone: object?.time_zone || null,
    correlationToken: tracking?.utm_content ? String(tracking.utm_content) : null,
    rescheduled: Boolean(object?.rescheduled),
    status: eventType === 'scheduler.scheduled_event_canceled'
      ? 'cancelled'
      : object?.rescheduled ? 'rescheduled' : 'scheduled'
  }
}

export function myNotesEvent(body) {
  if (String(body?.event || '') !== 'my_notes.note_generated') return null
  const object = body?.payload?.object || {}
  return {
    noteId: object.note_id ? String(object.note_id) : null,
    operatorId: body?.payload?.operator_id ? String(body.payload.operator_id) : null,
    accountId: body?.payload?.account_id ? String(body.payload.account_id) : null,
    meetingId: object.meeting_id ? String(object.meeting_id) : null,
    createdTime: object.created_time || null,
    updatedTime: object.updated_time || null
  }
}

export function canonicaliseMyNotesTranscript(transcript) {
  if (!transcript || !Array.isArray(transcript.items) || transcript.items.length === 0) return ''
  const speakers = new Map(
    (Array.isArray(transcript.speakers) ? transcript.speakers : [])
      .filter(speaker => speaker?.speaker_id)
      .map(speaker => [String(speaker.speaker_id), String(speaker.display_name || '').trim()])
  )

  return transcript.items.map(item => {
    const speakerId = item?.speaker_id ? String(item.speaker_id) : ''
    const suppliedName = speakers.get(speakerId)
    const speaker = suppliedName || (speakerId ? `Speaker ${speakerId}` : 'Speaker')
    const startTime = item?.start_time ? String(item.start_time) : '00:00:00.000'
    const text = String(item?.text || '').trim()
    return `[${startTime}] ${speaker}: ${text}`
  }).join('\n\n')
}

export function safeZoomWebhookPayload(body) {
  const schedulerEvent = schedulerAppointmentEvent(body)
  if (schedulerEvent) {
    return {
      event: schedulerEvent.eventType,
      event_ts: body?.event_ts || null,
      payload: {
        object: {
          scheduled_event: {
            event_id: schedulerEvent.eventId,
            start_date_time: schedulerEvent.startsAt,
            end_date_time: schedulerEvent.endsAt,
            status: body?.payload?.object?.scheduled_event?.status || null,
            location_kind: body?.payload?.object?.scheduled_event?.location_kind || null,
            external_location: {
              kind: body?.payload?.object?.scheduled_event?.external_location?.kind || null,
              meeting_id: schedulerEvent.meetingId
            }
          },
          time_zone: schedulerEvent.timezone,
          rescheduled: schedulerEvent.rescheduled,
          tracking: {
            utm_content: schedulerEvent.correlationToken
          }
        }
      }
    }
  }

  const noteEvent = myNotesEvent(body)
  if (noteEvent) {
    return {
      event: 'my_notes.note_generated',
      event_ts: body?.event_ts || null,
      payload: {
        account_id: noteEvent.accountId,
        operator_id: noteEvent.operatorId,
        object: {
          note_id: noteEvent.noteId,
          created_time: noteEvent.createdTime,
          updated_time: noteEvent.updatedTime,
          meeting_id: noteEvent.meetingId
        }
      }
    }
  }

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
