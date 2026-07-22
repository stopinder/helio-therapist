import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('calendar events open a Helio-controlled detail popover', async () => {
  const calendar = await readFile(new URL('../src/components/CalendarSchedule.vue', import.meta.url), 'utf8')

  assert.match(calendar, /data-testid="helio-event-popover"/)
  assert.match(calendar, /Open in Google Calendar ↗/)
  assert.match(calendar, /Join video call ↗/)
  assert.match(calendar, /function positionEventPopover/)
  assert.match(calendar, /function closeEventPopover/)
  assert.doesNotMatch(calendar, /class="modal-backdrop"/)
  assert.doesNotMatch(calendar, /class="event-modal"/)
})
