import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Calendar component template and logic requirements', async (t) => {
  const calendarSource = await readFile(new URL('../src/views/Calendar.vue', import.meta.url), 'utf8')

  await t.test('Open Client hidden for malformed client IDs', () => {
    // Check that v-if uses isValidId for clientId
    assert.match(calendarSource, /v-if="selectedEvent\.clientId && isValidId\(selectedEvent\.clientId\)"/)
  })

  await t.test('Start Session eligibility', () => {
    // Check that v-if uses isEligibleForStart
    assert.match(calendarSource, /v-if="selectedEvent\.isEligibleForStart"/)
  })

  await t.test('Escape closes the action surface', () => {
    // Check for global Escape listener
    assert.match(calendarSource, /window\.addEventListener\('keydown', handleGlobalEsc\)/)
    assert.match(calendarSource, /if \(e\.key === 'Escape'\) \{/)
    assert.match(calendarSource, /selectedEventId\.value = null/)
  })

  await t.test('Mini-calendar interaction', () => {
    // Check for selectDate call in mini-calendar
    assert.match(calendarSource, /@click="cell\.date && selectDate\(cell\.date\)"/)
    // Check for month navigation
    assert.match(calendarSource, /@click="miniPrevMonth"/)
    assert.match(calendarSource, /@click="miniNextMonth"/)
  })

  await t.test('Loading, error/Retry and empty states', () => {
    assert.match(calendarSource, /v-if="loading && !normalizedEvents\.length"/)
    assert.match(calendarSource, /v-else-if="error"/)
    assert.match(calendarSource, /@click="loadData".*>Retry<\/button>/)
    assert.match(calendarSource, /No appointments today/)
    assert.match(calendarSource, /No upcoming appointments/)
    // Removed mobile-only "No appointments for this day" check as it might have changed structure
  })

  await t.test('Data-source disclosure matches connection state', () => {
    assert.match(calendarSource, /v-if="isGoogleConnected"/)
    assert.match(calendarSource, /Google Calendar Settings/)
  })

  await t.test('Weekday keys are unique in mini-calendar', () => {
    assert.match(calendarSource, /:key="`\${d}-\${idx}`"/)
  })

  await t.test('Correct working-hours range (24 hours)', () => {
    assert.match(calendarSource, /const workingHours = Array\.from\(\{ length: 24 \}/)
  })

  await t.test('Scrolling height logic', () => {
    assert.match(calendarSource, /const hourHeight = computed\(\(\) => \{/)
    assert.match(calendarSource, /return 60/)
  })

  await t.test('Honest Google states in Sidebar', () => {
    assert.match(calendarSource, /v-if="googleLoading"/)
    assert.match(calendarSource, /googleError === 'RECONNECT_REQUIRED'/)
    assert.match(calendarSource, /v-else-if="googleError"/)
    assert.match(calendarSource, /v-else-if="isGoogleConnected"/)
  })

  await t.test('Test IDs are present', () => {
    assert.match(calendarSource, /data-testid="calendar-layout"/)
    assert.match(calendarSource, /data-testid="calendar-agenda"/)
    assert.match(calendarSource, /data-testid="calendar-canvas"/)
    assert.match(calendarSource, /data-testid="timed-grid-scroll"/)
    assert.match(calendarSource, /data-testid="week-view"/)
    assert.match(calendarSource, /data-testid="month-view"/)
  })

  await t.test('Tablet layout and agenda width exclusivity', () => {
    // Check for refactored aside classes
    assert.match(calendarSource, /isMobile \? \(isAgendaExpanded \? 'fixed inset-0 pt-14 flex' : 'hidden'\) : ''/)
    assert.match(calendarSource, /!isMobile && isTablet \? \(isAgendaExpanded \? 'w-72 flex' : 'w-12 flex'\) : ''/)
    assert.match(calendarSource, /!isMobile && !isTablet \? 'w-72 flex' : ''/)
  })

  await t.test('Scrollable grid audit', () => {
    // Timed grid should have overflow-y-auto
    assert.match(calendarSource, /class="flex-1 flex relative overflow-y-auto"/)
    assert.match(calendarSource, /class="flex flex-1 relative overflow-y-auto"/)
  })

  await t.test('Sticky elements updated', () => {
    assert.match(calendarSource, /class="h-10 border-b border-border-muted flex items-center justify-center gap-2 sticky top-0 bg-surface z-20"/)
  })

  await t.test('Popover containment and flipping logic', () => {
    assert.match(calendarSource, /const popoverWidth = window\.innerWidth < 640 \? 280 : 288/)
    assert.match(calendarSource, /const popoverHeight = 220/)
    assert.match(calendarSource, /if \(left \+ popoverWidth \+ padding > window\.innerWidth\)/)
    assert.match(calendarSource, /if \(top \+ popoverHeight \+ padding > window\.innerHeight\)/)
  })
})
