import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('therapist workspace exposes scheduling as a header action without sidebar duplication', () => {
  const shell = read('src/layouts/AppShell.vue')
  const router = read('src/router/index.js')
  assert.match(shell, /Schedule appointment/)
  assert.match(shell, /to="\/schedule"/)
  assert.doesNotMatch(shell, /{name:'Schedule',path:'\/schedule'/)
  assert.match(router, /path:'\/schedule'/)
  assert.match(router, /ScheduleAppointment/)
})

test('scheduling requires client selection before generating a link', () => {
  const component = read('src/components/ScheduleAppointment.vue')
  assert.match(component, /Choose a client/)
  assert.match(component, /:disabled="!clientId \|\| loading"/)
  assert.match(component, /JSON\.stringify\(\{ clientId: clientId\.value \}\)/)
})

test('booking link endpoint validates therapist ownership and stores only opaque correlation data', () => {
  const endpoint = read('api/zoom/scheduler/create-booking-link.js')
  assert.match(endpoint, /\.eq\('user_id', user\.id\)/)
  assert.match(endpoint, /crypto\.randomBytes\(24\)/)
  assert.match(endpoint, /correlation_token: correlationToken/)
  assert.match(endpoint, /utm_content/)
  assert.doesNotMatch(endpoint, /display_name/)
})

test('appointments migration enforces therapist ownership with RLS', () => {
  const migration = read('supabase/migrations/20260808164539_add_appointments.sql')
  assert.match(migration, /enable row level security/)
  assert.match(migration, /auth\.uid\(\) = user_id/)
  assert.match(migration, /c\.user_id = auth\.uid\(\)/)
  assert.match(migration, /not a clinical record/i)
})
