import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')

test('global header provides therapist time and next-session awareness', () => {
  assert.match(shell, /data-testid="global-session-clock"/)
  assert.match(shell, /\{\{ currentTimeLabel \}\}/)
  assert.match(shell, /Next session \{\{ nextSessionTimeLabel \}\}/)
  assert.match(shell, /\{\{ nextSessionCountdownLabel \}\}/)
})

test('global session clock reuses scheduled appointments without client identity', () => {
  assert.match(shell, /import \{ listScheduledAppointments \} from '\.\.\/lib\/appointments\.js'/)
  assert.match(shell, /appointments\.value=await listScheduledAppointments\(\)/)
  assert.doesNotMatch(shell, /global-session-clock[^]*display_name/)
})

test('next scheduled appointment is a one-click session entry action', () => {
  assert.match(shell, /Join next session/)
  assert.match(shell, /createOrResumeSession/)
  assert.match(shell, /authenticatedFetch\('\/api\/zoom\/join-appointment'/)
  assert.match(shell, /appointmentId:nextAppointment\.value\.id/)
  assert.match(shell, /router\.push\(`\/clients\/\$\{session\.clientId\}\/sessions\/\$\{session\.id\}`\)/)
  assert.match(shell, /window\.open\(data\.startUrl/)
})

test('schedule appointment is not the competing global primary action when a next session exists', () => {
  assert.match(shell, /v-if="nextAppointment"[^>]*>\{\{ joiningNextSession \? 'Opening…' : 'Join next session' \}\}<\/button>/)
  assert.match(shell, /v-else-if="\$route\.path!=='\/schedule'"/)
})

test('clock refreshes while the shell is mounted and cleans up its timer', () => {
  assert.match(shell, /window\.setInterval\(\(\)=>\{now\.value=new Date\(\)\},30000\)/)
  assert.match(shell, /window\.clearInterval\(clockTimer\)/)
})
