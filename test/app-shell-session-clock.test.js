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

test('clock refreshes while the shell is mounted and cleans up its timer', () => {
  assert.match(shell, /window\.setInterval\(\(\)=>\{now\.value=new Date\(\)\},30000\)/)
  assert.match(shell, /window\.clearInterval\(clockTimer\)/)
})
