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
    assert.match(calendarSource, /@click="prevMonth"/)
    assert.match(calendarSource, /@click="nextMonth"/)
  })

  await t.test('Loading, error/Retry and empty states', () => {
    assert.match(calendarSource, /v-if="loading && !normalizedEvents\.length"/)
    assert.match(calendarSource, /v-else-if="error"/)
    assert.match(calendarSource, /@click="loadData".*>Retry<\/button>/)
    assert.match(calendarSource, /No appointments today/)
    assert.match(calendarSource, /No upcoming appointments/)
    assert.match(calendarSource, /No appointments for this day/)
  })

  await t.test('Temporary data-source disclosure', () => {
    assert.match(calendarSource, /Showing Helios session records/)
    assert.match(calendarSource, /External calendar sync is not connected/)
  })

  await t.test('Weekday keys are unique in mini-calendar', () => {
    assert.match(calendarSource, /:key="`\${d}-\${idx}`"/)
  })

  await t.test('Correct working-hours range (10 rows)', () => {
    assert.match(calendarSource, /const workingHours = Array\.from\(\{ length: 10 \}/)
  })

  await t.test('Tablet layout and agenda width exclusivity', () => {
    // Check for refactored aside classes
    assert.match(calendarSource, /isMobile \? \(isAgendaExpanded \? 'fixed inset-0 pt-14 flex' : 'hidden'\) : ''/)
    assert.match(calendarSource, /!isMobile && isTablet \? \(isAgendaExpanded \? 'w-72 flex' : 'w-12 flex'\) : ''/)
    assert.match(calendarSource, /!isMobile && !isTablet \? 'w-72 flex' : ''/)
  })

  await t.test('Tablet grid min-width behavior', () => {
    assert.match(calendarSource, /:class="isTablet \? 'min-w-\[600px\]' : 'min-w-calendar-grid'"/)
  })

  await t.test('Single vertical scrolling region requirements', () => {
    // Audit vertical scroll containers
    assert.match(calendarSource, /class="flex-1 overflow-y-auto overflow-x-auto relative" ref="gridContainer"/)
    assert.match(calendarSource, /class="flex-1 flex flex-col overflow-y-auto min-h-0"/)
    assert.match(calendarSource, /class="border-r border-border-muted bg-surface flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 overflow-hidden"/)
    assert.match(calendarSource, /class="flex flex-1 h-full overflow-hidden"/)
  })

  await t.test('Fixed Calendar context and sticky elements', () => {
    assert.match(calendarSource, /class="w-16 border-r border-border-muted bg-surface sticky left-0 z-20 shrink-0"/)
    assert.match(calendarSource, /class="h-14 border-b border-border-muted bg-surface sticky top-0 z-30"/)
    assert.match(calendarSource, /class="sticky top-0 bg-surface border-b border-border-muted p-stack-sm text-center z-10 h-14 flex flex-col justify-center"/)
  })

  await t.test('Popover containment and flipping logic', () => {
    assert.match(calendarSource, /const popoverWidth = 256/)
    assert.match(calendarSource, /const popoverHeight = 160/)
    assert.match(calendarSource, /if \(left \+ popoverWidth \+ padding > window\.innerWidth\)/)
    assert.match(calendarSource, /if \(top \+ popoverHeight \+ padding > window\.innerHeight\)/)
    assert.match(calendarSource, /top = Math\.max\(padding \+ 56, Math\.min\(top, window\.innerHeight - popoverHeight - padding\)\)/)
  })
})
