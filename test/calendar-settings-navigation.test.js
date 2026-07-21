import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('keeps calendar recovery in the workspace rather than routing routine work to Settings', async () => {
  const calendar = await readFile(new URL('../src/components/CalendarSchedule.vue', import.meta.url), 'utf8')

  assert.match(calendar, /Google Calendar needs your permission again/)
  assert.match(calendar, /@click="reconnectGoogle"/)
  assert.match(calendar, /authenticatedFetch\('\/api\/google\/authorize'/)
  assert.doesNotMatch(calendar, /Go to Settings/)
})
