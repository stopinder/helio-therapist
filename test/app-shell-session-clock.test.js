import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { nextTimedAppointment } from '../src/lib/nextAppointment.js'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')

test('global header uses neutral appointment wording', () => {
  assert.match(shell, /data-testid="global-appointment-clock"/)
  assert.match(shell, /\{\{ currentTimeLabel \}\}/)
  assert.match(shell, /Next \{\{ nextAppointmentTimeLabel \}\}/)
  assert.match(shell, /\{\{ nextAppointmentCountdownLabel \}\}/)
  assert.match(shell, /No upcoming appointment/)
})

test('global appointment clock considers confirmed internal and Google timed events without client identity', () => {
  assert.match(shell, /import \{ nextTimedAppointment \} from '\.\.\/lib\/nextAppointment\.js'/)
  assert.match(shell, /authenticatedFetch\('\/api\/google\/status'/)
  assert.match(shell, /authenticatedFetch\(`\/api\/google\/events\?\$\{params\.toString\(\)\}`/)
  assert.match(shell, /nextTimedAppointment\(\{appointments:appointments\.value,googleEvents:googleEvents\.value,now:now\.value\}\)/)
  assert.doesNotMatch(shell, /global-appointment-clock[^]*display_name/)
})

test('orphan scheduled rows do not create a false global appointment', () => {
  const now = new Date('2026-08-23T10:00:00Z')
  const result = nextTimedAppointment({
    now,
    appointments: [{ id: 'orphan', status: 'scheduled', starts_at: '2026-08-23T11:00:00Z', zoom_meeting_id: null, zoom_event_id: null, google_event_id: null }]
  })
  assert.equal(result, null)
})

test('confirmed linked appointment remains eligible for the global clock', () => {
  const now = new Date('2026-08-23T10:00:00Z')
  const result = nextTimedAppointment({
    now,
    appointments: [{ id: 'confirmed', status: 'scheduled', starts_at: '2026-08-23T11:00:00Z', zoom_meeting_id: '123' }]
  })
  assert.equal(result?.appointment?.id, 'confirmed')
})

test('join action is offered only for a joinable confirmed Helios appointment', () => {
  assert.match(shell, /const canJoinNextAppointment=computed/)
  assert.match(shell, /v-if="canJoinNextAppointment"/)
  assert.match(shell, /'Join'/)
  assert.match(shell, /createOrResumeSession/)
  assert.match(shell, /authenticatedFetch\('\/api\/zoom\/join-appointment'/)
  assert.match(shell, /appointmentId:appointment\.id/)
})

test('global clock highlights an appointment only within the final 15 minutes', () => {
  assert.match(shell, /const minutesUntilNextAppointment=computed/)
  assert.match(shell, /minutesUntilNextAppointment\.value>=0&&minutesUntilNextAppointment\.value<=15/)
  assert.match(shell, /data-appointment-approaching="isAppointmentApproaching \? 'true' : 'false'"/)
})

test('clock and appointment data refresh while the shell is mounted and clean up their timers', () => {
  assert.match(shell, /window\.setInterval\(\(\)=>\{now\.value=new Date\(\)\},30000\)/)
  assert.match(shell, /appointmentRefreshTimer=window\.setInterval\(refreshAppointments,60000\)/)
  assert.match(shell, /window\.addEventListener\('focus',refreshAppointments\)/)
  assert.match(shell, /document\.addEventListener\('visibilitychange',refreshAppointmentsWhenActive\)/)
  assert.match(shell, /window\.clearInterval\(clockTimer\)/)
  assert.match(shell, /window\.clearInterval\(appointmentRefreshTimer\)/)
})

test('global controls share one compact height', () => {
  assert.match(shell, /h-9 inline-flex items-center/)
  assert.match(shell, /inline-flex h-9 items-center/)
  assert.match(shell, /inline-flex h-9 items-center justify-center/)
})
