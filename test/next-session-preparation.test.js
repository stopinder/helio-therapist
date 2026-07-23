import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Today has one focused before-session preparation state', async () => {
  const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  const calendar = await readFile(new URL('../src/components/CalendarSchedule.vue', import.meta.url), 'utf8')
  const preparation = await readFile(new URL('../src/components/NextSessionPreparation.vue', import.meta.url), 'utf8')

  assert.match(app, /<NextSessionPreparation/)
  assert.doesNotMatch(app, /Later today/)
  assert.match(app, /reference-view/)
  assert.match(calendar, /next-appointment/)
  assert.match(calendar, /upcoming-appointments/)
  assert.match(calendar, /referenceView/)
  assert.match(calendar, /addDays\(start, 30\)/)
  assert.match(calendar, /new Date\(event\.start\)\.getTime\(\) > now/)
  assert.match(preparation, /Current focus/)
  assert.match(preparation, /Next client/)
  assert.match(preparation, /Last clinically useful development/)
  assert.match(preparation, /Preparation item/)
  assert.match(preparation, />Prepare for session</)
  assert.doesNotMatch(preparation, /End of day/i)
})
