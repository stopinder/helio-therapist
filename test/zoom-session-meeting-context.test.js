import test from 'node:test';
import assert from 'node:assert/strict';
import { closestAppointmentMeeting } from '../api/zoom/start-session.js';

test('closestAppointmentMeeting chooses the scheduled Zoom meeting nearest the session', () => {
  const result = closestAppointmentMeeting([
    { id: 'later', starts_at: '2026-08-12T15:00:00.000Z', zoom_meeting_id: '222' },
    { id: 'nearest', starts_at: '2026-08-12T10:15:00.000Z', zoom_meeting_id: '111' }
  ], '2026-08-12T10:00:00.000Z');

  assert.equal(result?.id, 'nearest');
  assert.equal(result?.zoom_meeting_id, '111');
});

test('closestAppointmentMeeting ignores meetings outside the bounded matching window', () => {
  const result = closestAppointmentMeeting([
    { id: 'old', starts_at: '2026-08-10T10:00:00.000Z', zoom_meeting_id: '111' }
  ], '2026-08-12T10:00:00.000Z');

  assert.equal(result, null);
});

test('closestAppointmentMeeting ignores appointments without Zoom meeting identifiers', () => {
  const result = closestAppointmentMeeting([
    { id: 'no-zoom', starts_at: '2026-08-12T10:00:00.000Z', zoom_meeting_id: null }
  ], '2026-08-12T10:00:00.000Z');

  assert.equal(result, null);
});
