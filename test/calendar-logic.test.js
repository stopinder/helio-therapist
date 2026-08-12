import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getStartOfWeek,
  isValidId,
  isEligibleForStart,
  isAppointmentEligibleForStart,
  addMonths,
  getEventStyle,
  getOverlappingGroups,
  getMiniCalendarCells,
  getViewRange
} from '../src/lib/calendarHelpers.js'

test('Calendar logic and date alignment', async (t) => {
  await t.test('View range calculation: Day', () => {
    const range = getViewRange(new Date(2026, 7, 1), 'day')
    assert.strictEqual(range.start.getDate(), 1)
    assert.strictEqual(range.end.getDate(), 2)
  })
  await t.test('View range calculation: Week (Monday start)', () => {
    const range = getViewRange(new Date(2026, 7, 5), 'week')
    assert.strictEqual(range.start.getDate(), 3)
    assert.strictEqual(range.start.getDay(), 1)
    assert.strictEqual(range.end.getDate(), 10)
  })
  await t.test('View range calculation: Month (6-row grid)', () => {
    const range = getViewRange(new Date(2026, 7, 1), 'month')
    assert.strictEqual(range.start.getDate(), 27)
    assert.strictEqual(range.start.getMonth(), 6)
    assert.strictEqual(range.end.getDate(), 7)
    assert.strictEqual(range.end.getMonth(), 8)
  })
  await t.test('Mini-calendar weekday alignment for August 2026', () => {
    const cells = getMiniCalendarCells(new Date(2026, 7, 1), new Date(2026, 7, 1))
    assert.strictEqual(cells.filter(c => c.date === null && c.key.startsWith('blank-start')).length, 5)
    assert.strictEqual(cells[5].date.getDate(), 1)
  })
  await t.test('Leap year: February 2024 has 29 days', () => assert.strictEqual(new Date(2024, 2, 0).getDate(), 29))
  await t.test('Start of week calculation (Monday)', () => {
    const start = getStartOfWeek(new Date(2026, 7, 2))
    assert.strictEqual(start.getDate(), 27)
    assert.strictEqual(start.getMonth(), 6)
    assert.strictEqual(start.getDay(), 1)
  })
  await t.test('Month navigation safety (Jan 31 -> Feb)', () => {
    const feb = addMonths(new Date(2026, 0, 31), 1)
    assert.strictEqual(feb.getMonth(), 1)
    assert.strictEqual(feb.getDate(), 28)
  })
})

test('Appointment eligibility logic', async (t) => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'
  assert.strictEqual(isValidId(validUUID), true)
  assert.strictEqual(isEligibleForStart({ id: validUUID, clientId: validUUID, status: 'scheduled' }), true)
  assert.strictEqual(isEligibleForStart({ id: validUUID, clientId: validUUID, status: 'completed' }), false)

  const scheduledAppointment = { id: validUUID, client_id: validUUID, status: 'scheduled', starts_at: '2026-08-12T10:00:00Z' }
  assert.strictEqual(isAppointmentEligibleForStart(scheduledAppointment), true)
  assert.strictEqual(isAppointmentEligibleForStart({ ...scheduledAppointment, status: 'rescheduled' }), true)
  assert.strictEqual(isAppointmentEligibleForStart({ ...scheduledAppointment, status: 'cancelled' }), false)
  assert.strictEqual(isAppointmentEligibleForStart({ ...scheduledAppointment, client_id: 'invalid' }), false)
  assert.strictEqual(isAppointmentEligibleForStart({ ...scheduledAppointment, starts_at: null }), false)

  await t.test('Event positioning and height', () => {
    const style = getEventStyle({ start: new Date(2026, 7, 1, 9, 0), end: new Date(2026, 7, 1, 10, 0) })
    assert.strictEqual(style.top, '80px')
    assert.strictEqual(style.height, '80px')
  })
  await t.test('Overlapping appointments logic', () => {
    const e1 = { id: '1', start: new Date(2026, 7, 1, 10), end: new Date(2026, 7, 1, 11) }
    const e2 = { id: '2', start: new Date(2026, 7, 1, 10, 30), end: new Date(2026, 7, 1, 11, 30) }
    const e3 = { id: '3', start: new Date(2026, 7, 1, 12), end: new Date(2026, 7, 1, 13) }
    const styles = getOverlappingGroups([e1, e2, e3])
    assert.strictEqual(styles['1'].totalColumns, 2)
    assert.strictEqual(styles['2'].totalColumns, 2)
    assert.strictEqual(styles['3'].totalColumns, 1)
  })
})
