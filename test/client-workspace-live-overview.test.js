import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace overview uses live sources and honest empty states', async () => {
  const view = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  const appointments = await readFile(new URL('../src/lib/appointments.js', import.meta.url), 'utf8')
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const attention = await readFile(new URL('../src/components/workspace/ClinicalAttentionPanel.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(view, /mockClient|clientWorkspaceData/)
  assert.match(view, /listSessions\(\{\s*clientId:\s*route\.params\.clientId\s*\}\)/)
  assert.match(view, /listClientAppointments\(\{\s*clientId:\s*route\.params\.clientId\s*\}\)/)
  assert.match(view, /No sessions recorded for this client yet\./)
  assert.match(view, /No structured tasks are recorded for this client yet\./)
  assert.match(view, /No upcoming appointment is recorded\./)
  assert.match(view, /getCurrentTherapistLabel/)

  assert.match(appointments, /\.from\('appointments'\)/)
  assert.match(appointments, /\.eq\('client_id', clientId\)/)
  assert.match(appointments, /\.in\('status', \['scheduled', 'rescheduled'\]\)/)
  assert.match(header, /nextAppointmentLabel/)
  assert.match(header, /therapistLabel/)
  assert.match(attention, /No clinical attention items are recorded for this client\./)
})
