import test from 'node:test'
import assert from 'node:assert/strict'
import { 
  getStartOfWeek, 
  isValidId, 
  isEligibleForStart, 
  addMonths, 
  getEventStyle, 
  getOverlappingGroups 
} from '../src/lib/calendarHelpers.js'

test('Calendar logic and date alignment', async (t) => {
  
  await t.test('Mini-calendar weekday alignment for August 2026', () => {
    // 1 August 2026 should be Saturday
    const aug1_2026 = new Date(2026, 7, 1);
    assert.strictEqual(aug1_2026.getDay(), 6); // 6 is Saturday
    
    // Mini-calendar calculation (Monday start)
    const firstDay = new Date(2026, 7, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    assert.strictEqual(startOffset, 5, 'August 1 2026 should have 5 leading blank cells');
  });

  await t.test('Leap year: February 2024 has 29 days', () => {
    const feb2024LastDay = new Date(2024, 2, 0); 
    assert.strictEqual(feb2024LastDay.getDate(), 29);
  });

  await t.test('Start of week calculation (Monday)', () => {
    const sunday = new Date(2026, 7, 2);
    const start = getStartOfWeek(sunday);
    
    assert.strictEqual(start.getDate(), 27);
    assert.strictEqual(start.getMonth(), 6); // July
    assert.strictEqual(start.getDay(), 1); // Monday
  });

  await t.test('Month navigation safety (Jan 31 -> Feb)', () => {
    const jan31 = new Date(2026, 0, 31);
    const feb = addMonths(jan31, 1);
    assert.strictEqual(feb.getMonth(), 1); // February
    assert.strictEqual(feb.getDate(), 28); // Clamped to Feb 28
  });
});

test('Appointment eligibility logic', async (t) => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const mockSessions = [
    { id: validUUID, clientId: validUUID, status: 'scheduled' },
    { id: validUUID, clientId: validUUID, status: 'completed' },
    { id: validUUID, clientId: validUUID, status: 'cancelled' },
    { id: validUUID, clientId: 'invalid-id', status: 'scheduled' },
    { id: null, clientId: validUUID, status: 'scheduled' }
  ];

  assert.strictEqual(isEligibleForStart(mockSessions[0]), true, 'Scheduled session with valid IDs should be eligible');
  assert.strictEqual(isEligibleForStart(mockSessions[1]), false, 'Completed session should not be eligible');
  assert.strictEqual(isEligibleForStart(mockSessions[2]), false, 'Cancelled session should not be eligible');
  assert.strictEqual(isEligibleForStart(mockSessions[3]), false, 'Session with invalid client ID should not be eligible');
  assert.strictEqual(isEligibleForStart(mockSessions[4]), false, 'Session without ID should not be eligible');

  await t.test('Event positioning and height (No header offset)', () => {
    const event1 = { start: new Date(2026, 7, 1, 9, 0), end: new Date(2026, 7, 1, 10, 0) };
    const style1 = getEventStyle(event1);
    assert.strictEqual(style1.top, '80px'); // (9-8)*80 = 80
    assert.strictEqual(style1.height, '80px'); // 1*80 = 80

    const event2 = { start: new Date(2026, 7, 1, 14, 30), end: new Date(2026, 7, 1, 15, 0) };
    const style2 = getEventStyle(event2);
    assert.strictEqual(style2.top, '520px'); // (14.5-8)*80 = 6.5*80 = 520
    assert.strictEqual(style2.height, '40px'); // 0.5*80 = 40
  });

  await t.test('Overlapping appointments logic', () => {
    const e1 = { id: '1', start: new Date(2026, 7, 1, 10, 0), end: new Date(2026, 7, 1, 11, 0) };
    const e2 = { id: '2', start: new Date(2026, 7, 1, 10, 30), end: new Date(2026, 7, 1, 11, 30) };
    const e3 = { id: '3', start: new Date(2026, 7, 1, 12, 0), end: new Date(2026, 7, 1, 13, 0) };
    
    const styles = getOverlappingGroups([e1, e2, e3]);
    
    assert.strictEqual(styles['1'].totalColumns, 2);
    assert.strictEqual(styles['2'].totalColumns, 2);
    assert.strictEqual(styles['3'].totalColumns, 1);
    assert.notStrictEqual(styles['1'].column, styles['2'].column);
  });
});
