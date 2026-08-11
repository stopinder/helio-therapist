import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Calendar filtering logic audit', async (t) => {
  const source = await readFile(new URL('../src/composables/useCalendar.js', import.meta.url), 'utf8')

  await t.test('keeps workspace-created in-progress sessions out of the calendar', () => {
    assert.match(source, /session\.startedAt && session\.workflowStatus === 'completed' && session\.completedAt/)
    assert.doesNotMatch(source, /sessions\.value\s*\.filter\([^)]*status\s*===\s*['"]in_progress/)
  })

  await t.test('adds canonical scheduled and rescheduled Helios appointments', () => {
    assert.match(source, /listCalendarAppointments/)
    assert.match(source, /const heliosAppointments = appointments\.value/)
    assert.match(source, /source: 'appointment'/)
  })

  await t.test('only enables session start when a real eligible session is linked', () => {
    assert.match(source, /sessionId: linkedSession\?\.id \|\| null/)
    assert.match(source, /isEligibleForStart: Boolean\(linkedSession\)/)
    assert.match(source, /isEligibleForStart\(session\)/)
  })

  await t.test('uses authoritative Google event linkage before title matching', () => {
    assert.match(source, /appointment\.googleEventId/)
    assert.match(source, /String\(appointment\.googleEventId\) === String\(event\.id\)/)
    assert.match(source, /if \(linkedAppointment\) return null/)
  })

  await t.test('never presents an unmatched external event title as a client identity', () => {
    assert.match(source, /clientName = matchedClient\?\.display_name \|\| 'Client not linked'/)
    assert.match(source, /title: title \|\| '\(No title\)'/)
  })

  await t.test('deduplicates Google events against Helios appointments and completed sessions', () => {
    assert.match(source, /duplicateHelios/)
    assert.match(source, /duplicateClinical/)
    assert.match(source, /if \(duplicateHelios \|\| duplicateClinical\) return null/)
  })
})
