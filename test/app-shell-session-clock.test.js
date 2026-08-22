import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
const helper = await readFile(new URL('../src/lib/nextAppointment.js', import.meta.url), 'utf8')

test('global header uses neutral appointment wording', () => {
  assert.match(shell, /data-testid="global-session-clock"/)
  assert.match(shell, /\{\{ currentTimeLabel \}\}/)
  assert.match(shell, /Next appointment \{\{ nextAppointmentTimeLabel \}\}/)
  assert.match(shell, /\{\{ nextAppointmentCountdownLabel \}\}/)
  assert.match(shell, /No upcoming appointment/)
  assert.doesNotMatch(shell, /Next session \{\{/)
})

test('global appointment clock considers internal and Google timed events without client identity', () => {
  assert.match(shell, /import \{ nextTimedAppointment \} from '\.\.\/lib\/nextAppointment\.js'/)
  assert.match(shell, /authenticatedFetch\('\/api\/google\/status'/)
  assert.match(shell, /authenticatedFetch\(`\/api\/google\/events\?\$\{params\.toString\(\)\}`/)
  assert.match(shell, /nextTimedAppointment\(\{ appointments:appointments\.value, googleEvents:googleEvents\.value, now:now\.value \}\)/)
  assert.match(helper, /filter\(event => !event\?\.allDay\)/)
  assert.doesNotMatch(shell, /global-session-clock[^]*display_name/)
})

test('join action is offered only when the next global appointment is a Helios appointment', () => {
  assert.match(shell, /v-if="nextGlobalAppointment\?\.source==='appointment'"/)
  assert.match(shell, /Join appointment/)
  assert.match(shell, /createOrResumeSession/)
  assert.match(shell, /authenticatedFetch\('\/api\/zoom\/join-appointment'/)
  assert.match(shell, /appointmentId:nextGlobalAppointment\.value\.appointment\.id/)
})

test('global clock highlights an appointment only within the final 15 minutes', () => {
  assert.match(shell, /const minutesUntilNextAppointment=computed/)
  assert.match(shell, /minutesUntilNextAppointment\.value>=0&&minutesUntilNextAppointment\.value<=15/)
  assert.match(shell, /data-session-approaching="isAppointmentApproaching \? 'true' : 'false'"/)
})

test('clock and appointment data refresh while the shell is mounted and clean up their timers', () => {
  assert.match(shell, /window\.setInterval\(\(\)=>\{now\.value=new Date\(\)\},30000\)/)
  assert.match(shell, /appointmentRefreshTimer=window\.setInterval\(refreshAppointments,60000\)/)
  assert.match(shell, /window\.addEventListener\('focus',refreshAppointments\)/)
  assert.match(shell, /document\.addEventListener\('visibilitychange',refreshAppointmentsWhenActive\)/)
  assert.match(shell, /window\.clearInterval\(clockTimer\)/)
  assert.match(shell, /window\.clearInterval\(appointmentRefreshTimer\)/)
})
