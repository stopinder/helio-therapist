import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Overview view requirements', async () => {
  const overview = await readFile(new URL('../src/views/Overview.vue', import.meta.url), 'utf8')

  // Greeting and Today's Date
  assert.match(overview, /\{\{ todayLabel \}\}/)
  assert.match(overview, /Good afternoon, Robert/)

  // Today's Schedule
  assert.match(overview, /Today’s Schedule/)
  assert.match(overview, /v-for="event in todayEvents"/)
  assert.match(overview, /formatTime\(event.start\)/)
  assert.match(overview, /event.clientName/)
  assert.match(overview, /formatStatus\(event.status\)/)
  assert.match(overview, /Open Client/)
  assert.match(overview, /Start Session/)
  
  // Sorting chronologically (verified in composable test)
  assert.match(overview, /View Calendar →/)

  // Continue Working
  assert.match(overview, /Continue Working/)
  assert.match(overview, /pendingWork/)
  assert.match(overview, /No pending drafts or reviews./)

  // Practice Focus
  assert.match(overview, /Practice Focus/)
  assert.match(overview, /practiceFocusObservation/)

  // Professional Development summary
  assert.match(overview, /Development/)
  assert.match(overview, /Supervision Prep/)
  assert.match(overview, /Go to Supervision →/)
  assert.match(overview, /reflectionsCount/)

  // Recent Activity
  assert.match(overview, /Recent Activity/)
  assert.match(overview, /No recent activity to show./)

  // No unsupported clinical data/metrics
  assert.doesNotMatch(overview, /PHQ-9/)
  assert.doesNotMatch(overview, /GAD-7/)
  assert.doesNotMatch(overview, /score/)
})

test('Calendar view requirements', async () => {
  const calendar = await readFile(new URL('../src/views/Calendar.vue', import.meta.url), 'utf8')

  // Agenda Panel
  assert.match(calendar, /Agenda Panel/)
  assert.match(calendar, /currentMonthName/)
  assert.match(calendar, /Today/)
  assert.match(calendar, /Upcoming/)
  assert.match(calendar, /Showing Helios session records/)
  assert.match(calendar, /External calendar sync is not connected/)

  // Main Calendar Canvas (Week View)
  assert.match(calendar, /currentRangeLabel/)
  assert.match(calendar, /moveWeek\(-1\)/)
  assert.match(calendar, /moveWeek\(1\)/)
  assert.match(calendar, /goToday/)
  assert.match(calendar, /v-for="day in weekDays\.slice\(0, 5\)"/)
  assert.match(calendar, /day.shortName/)
  assert.match(calendar, /day.date.getDate\(\)/)

  // Events in Canvas
  assert.match(calendar, /v-for="event in day.events"/)
  assert.match(calendar, /event.clientName/)
  assert.match(calendar, /formatTime\(event.start\)/)

  // Selection Logic
  assert.match(calendar, /selectedEventId === event.id/)
  assert.match(calendar, /selectAppointment\(event, \$event\)/)
  assert.match(calendar, /Open Client/)
  assert.match(calendar, /Start Session/)
  
  // Routes
  assert.match(calendar, /:to="`\/clients\/\${selectedEvent.clientId}`"/)
  assert.match(calendar, /:to="`\/clients\/\${selectedEvent.clientId}\/sessions\/\${selectedEvent.id}`"/)

  // No Right Inspector / Clinical Panel
  assert.doesNotMatch(calendar, /inspector/)
  assert.doesNotMatch(calendar, /clinical-panel/)
  assert.doesNotMatch(calendar, /preparation-panel/)
  
  // No Editing Controls
  assert.doesNotMatch(calendar, /edit-appointment/)
  assert.doesNotMatch(calendar, /create-appointment/)
  assert.doesNotMatch(calendar, /drag-and-drop/)
})
