
import test from 'node:test'
import assert from 'node:assert/strict'
import { getViewRange, getStartOfWeek } from '../src/lib/calendarHelpers.js'

test('Calendar Regression: Week and Day Ranges', async (t) => {
  await t.test('Full Week view range is 7 days', () => {
    const date = new Date(2026, 7, 15) // Saturday
    const range = getViewRange(date, 'week')
    const days = (range.end - range.start) / (1000 * 60 * 60 * 24)
    assert.strictEqual(days, 7, 'Week range should be exactly 7 days')
    assert.strictEqual(range.start.getDay(), 1, 'Week should start on Monday')
  })

  await t.test('Day view range is 1 day', () => {
    const date = new Date(2026, 7, 15)
    const range = getViewRange(date, 'day')
    const days = (range.end - range.start) / (1000 * 60 * 60 * 24)
    assert.strictEqual(days, 1, 'Day range should be exactly 1 day')
  })
})

test('Calendar Regression: All-day Event Parsing', async (t) => {
  // Simulating the fix in useCalendar.js
  const parseEventDate = (dateStr, allDay) => {
    return allDay && typeof dateStr === 'string' && dateStr.length === 10
      ? new Date(dateStr + 'T00:00:00')
      : new Date(dateStr)
  }

  await t.test('All-day event stays on the correct date regardless of local timezone', () => {
    const dateStr = '2026-08-15'
    const parsed = parseEventDate(dateStr, true)
    
    assert.strictEqual(parsed.getFullYear(), 2026)
    assert.strictEqual(parsed.getMonth(), 7)
    assert.strictEqual(parsed.getDate(), 15)
    // If it was parsed as UTC (like new Date('2026-08-15')), 
    // it would be Aug 14 in negative offset timezones.
    // By adding T00:00:00, we force local time parsing.
  })
})

test('Calendar Regression: Merge Strategy', async (t) => {
  // Simulating the merge logic in useCalendar.js
  const mergeEvents = (oldEvents, newEvents, timeMin, timeMax) => {
    const merged = new Map()
    oldEvents.forEach(e => {
      const d = new Date(e.start)
      if (d < timeMin || d >= timeMax) {
        merged.set(e.id, e)
      }
    })
    newEvents.forEach(e => merged.set(e.id, e))
    return Array.from(merged.values())
  }

  await t.test('Merge strategy preserves events outside current fetch range', () => {
    const oldEvents = [
      { id: '1', start: '2026-08-01T10:00:00Z' }, // Outside range
      { id: '2', start: '2026-08-15T10:00:00Z' }  // Inside range
    ]
    const newEvents = [
      { id: '2', start: '2026-08-15T12:00:00Z' }, // Updated
      { id: '3', start: '2026-08-16T10:00:00Z' }  // New
    ]
    const timeMin = new Date('2026-08-10T00:00:00Z')
    const timeMax = new Date('2026-08-20T00:00:00Z')

    const result = mergeEvents(oldEvents, newEvents, timeMin, timeMax)
    assert.strictEqual(result.length, 3)
    assert.ok(result.find(e => e.id === '1'), 'Should keep event outside range')
    assert.strictEqual(result.find(e => e.id === '2').start, '2026-08-15T12:00:00Z', 'Should update event inside range')
  })
})
