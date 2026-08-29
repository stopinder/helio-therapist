import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { nextTimedAppointment } from '../src/lib/nextAppointment.js'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')

test('global header shows compact appointment context', () => {
  assert.match(shell, /data-testid="global-appointment-clock"/)
  assert.match(shell, /currentTimeLabel/)
  assert.match(shell, /nextAppointmentTimeLabel/)
  assert.match(shell, /nextAppointmentCountdownLabel/)
  assert.match(shell, /No upcoming appointment/)
})

test('global appointment clock loads Helios and Google timed events', () => {
  assert.match(shell, /nextTimedAppointment/)
  assert.match(shell, /\/api\/google\/status/)
  assert.match(shell, /\/api\/google\/events/)
  assert.match(shell, /appointments\.value/)
  assert.match(shell, /googleEvents\.value/)
})

test('sample appointments do not create a false global appointment', () => {
  const now = new Date('2026-08-23T10:00:00Z')
  const result = nextTimedAppointment({
    now,
    appointments: [{
      id: 'sample-appointment',
      status: 'scheduled',
      starts_at: '2026-08-23T11:00:00Z',
      clients: { reference: 'SAMPLE-001' }
    }]
  })
  assert.equal(result, null)
})

test('a real Helios appointment remains eligible even without integration ids', () => {
  const now = new Date('2026-08-23T10:00:00Z')
  const result = nextTimedAppointment({
    now,
    appointments: [{
      id: 'real',
      status: 'scheduled',
      starts_at: '2026-08-23T11:00:00Z',
      clients: { reference: null }
    }]
  })
  assert.equal(result?.appointment?.id, 'real')
})

test('Join remains visible but is enabled only for a joinable Helios appointment', () => {
  assert.match(shell, /canJoinNextAppointment/)
  assert.match(shell, /:disabled="!canJoinNextAppointment\s*\|\|\s*joiningNextAppointment"/)
  assert.match(shell, /Join/)
  assert.match(shell, /createOrResumeSession/)
  assert.match(shell, /\/api\/zoom\/join-appointment/)
})

test('global clock highlights an appointment only within the final 15 minutes', () => {
  assert.match(shell, /minutesUntilNextAppointment/)
  assert.match(shell, /<=\s*15/)
  assert.match(shell, /data-appointment-approaching/)
})

test('clock and appointment data refresh while the shell is mounted', () => {
  assert.match(shell, /setInterval/)
  assert.match(shell, /refreshAppointments/)
  assert.match(shell, /visibilitychange/)
  assert.match(shell, /clearInterval/)
})

test('global controls use the same compact height', () => {
  const compactControls = shell.match(/h-9/g) || []
  assert.ok(compactControls.length >= 3, 'Quick capture, Schedule and Join should all use h-9')
})
