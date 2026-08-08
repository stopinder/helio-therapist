import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  getZoomSchedulerAvailableTimes,
  listZoomSchedulerSchedules,
  summarizeZoomSchedulerProbe
} from '../api/_lib/zoom-scheduler.js'

test('Scheduler API helper uses the connected user token and expected read endpoints', async () => {
  const requests = []
  const fetchImpl = async (url, options) => {
    requests.push({ url, options })
    return {
      ok: true,
      status: 200,
      json: async () => url.endsWith('/scheduler/schedules')
        ? { items: [{ schedule_id: 'schedule-1', active: true }] }
        : { schedule_id: 'schedule-1', duration: 50, days: [] }
    }
  }

  const schedules = await listZoomSchedulerSchedules('secret-token', { fetchImpl })
  await getZoomSchedulerAvailableTimes('secret-token', schedules[0].schedule_id, { fetchImpl })

  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://api.zoom.us/v2/scheduler/schedules')
  assert.equal(requests[1].url, 'https://api.zoom.us/v2/scheduler/schedules/schedule-1/available_times')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer secret-token')
})

test('Scheduler probe summary exposes only capability metadata and available times', () => {
  const summary = summarizeZoomSchedulerProbe(
    [{ schedule_id: 'schedule-1', active: true }, { schedule_id: 'schedule-2', active: false }],
    {
      schedule_id: 'schedule-1',
      duration: 50,
      days: [{ spots: [
        { start_time: '2026-08-10T09:00:00Z', status: 'available', available_number: 1 },
        { start_time: '2026-08-10T10:00:00Z', status: 'busy', available_number: 0 }
      ] }]
    }
  )

  assert.deepEqual(summary, {
    scheduleCount: 2,
    activeScheduleCount: 1,
    scheduleId: 'schedule-1',
    duration: 50,
    availableSlotCount: 1,
    firstAvailableSlots: [{ startTime: '2026-08-10T09:00:00Z', availableNumber: 1 }]
  })
})

test('Scheduler probe stays authenticated and does not touch clinical session tables', async () => {
  const source = await readFile(new URL('../api/zoom/scheduler/probe.js', import.meta.url), 'utf8')
  assert.match(source, /requireAuthenticatedUser/)
  assert.match(source, /provider', 'zoom'/)
  assert.doesNotMatch(source, /from\('sessions'\)/)
  assert.doesNotMatch(source, /from\('clients'\)/)
  assert.doesNotMatch(source, /service_role/i)
})
