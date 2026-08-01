import test from 'node:test'
import assert from 'node:assert/strict'

// Mock dependencies since we're testing the logic, not the actual Supabase calls
// We'll test the helper functions and the logic derived from normalizedEvents

test('Calendar logic and date alignment', async (t) => {
  
  await t.test('Mini-calendar weekday alignment for August 2026', () => {
    // 1 August 2026 should be Saturday
    const aug1_2026 = new Date(2026, 7, 1);
    assert.strictEqual(aug1_2026.getDay(), 6); // 6 is Saturday
    
    // Mini-calendar calculation (Monday start)
    // firstDay.getDay() is 6
    // startOffset = (6 + 6) % 7 = 5
    // Cells before August 1st: M(0), T(1), W(2), T(3), F(4) -> 5 cells
    // August 1st is at index 5 (6th cell)
    const firstDay = new Date(2026, 7, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    assert.strictEqual(startOffset, 5, 'August 1 2026 should have 5 leading blank cells');
  });

  await t.test('Leap year: February 2024 has 29 days', () => {
    const feb2024LastDay = new Date(2024, 2, 0); // Month is 0-indexed, so 2 is March
    assert.strictEqual(feb2024LastDay.getDate(), 29);
  });

  await t.test('Leap year: February 2026 has 28 days', () => {
    const feb2026LastDay = new Date(2026, 2, 0);
    assert.strictEqual(feb2026LastDay.getDate(), 28);
  });

  await t.test('Start of week calculation (Monday)', () => {
    // Sunday, 2 August 2026
    const sunday = new Date(2026, 7, 2);
    const day = sunday.getDay(); // 0
    const diff = sunday.getDate() - (day === 0 ? 6 : day - 1); // 2 - 6 = -4
    const start = new Date(sunday.setDate(diff));
    
    assert.strictEqual(start.getDate(), 27);
    assert.strictEqual(start.getMonth(), 6); // July
    assert.strictEqual(start.getDay(), 1); // Monday
  });

  await t.test('Monday-Friday week generation', () => {
    const getWeekDaysCount = (viewDate) => {
      const getStartOfWeek = (date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - (day === 0 ? 6 : day - 1)
        const start = new Date(d.setDate(diff))
        start.setHours(0, 0, 0, 0)
        return start
      }
      const start = getStartOfWeek(viewDate)
      return Array.from({ length: 5 }, (_, i) => {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        return date
      }).length
    }
    assert.strictEqual(getWeekDaysCount(new Date()), 5);
  });
});

test('Appointment eligibility logic', async (t) => {
  const mockSessions = [
    { id: 's1', client_id: 'c1', occurred_at: '2026-08-01T10:00:00Z', status: 'scheduled' },
    { id: 's2', client_id: 'c1', occurred_at: '2026-08-01T11:00:00Z', status: 'completed' },
    { id: 's3', client_id: 'c1', occurred_at: '2026-08-01T12:00:00Z', status: 'cancelled' },
    { id: 's4', client_id: null, occurred_at: '2026-08-01T13:00:00Z', status: 'scheduled' },
    { id: null, client_id: 'c1', occurred_at: '2026-08-01T14:00:00Z', status: 'scheduled' }
  ];

  function isEligible(session) {
    return !!(session.id && 
           session.client_id && 
           !['completed', 'cancelled'].includes(session.status));
  }

  assert.strictEqual(isEligible(mockSessions[0]), true, 'Scheduled session should be eligible');
  assert.strictEqual(isEligible(mockSessions[1]), false, 'Completed session should not be eligible');
  assert.strictEqual(isEligible(mockSessions[2]), false, 'Cancelled session should not be eligible');
  assert.strictEqual(isEligible(mockSessions[3]), false, 'Session without client ID should not be eligible');
  assert.strictEqual(isEligible(mockSessions[4]), false, 'Session without ID should not be eligible');

  await t.test('Event positioning and height', () => {
    const getEventStyle = (event) => {
      const startHour = event.start.getHours() + event.start.getMinutes() / 60
      const endHour = event.end.getHours() + event.end.getMinutes() / 60
      const duration = endHour - startHour
      
      const top = (startHour - 8) * 80 + 56
      const height = Math.max(duration * 80, 24)
      
      return { top: `${top}px`, height: `${height}px` }
    }

    const event1 = { start: new Date(2026, 7, 1, 9, 0), end: new Date(2026, 7, 1, 10, 0) };
    const style1 = getEventStyle(event1);
    assert.strictEqual(style1.top, '136px'); // (9-8)*80 + 56 = 136
    assert.strictEqual(style1.height, '80px'); // 1*80 = 80

    const event2 = { start: new Date(2026, 7, 1, 14, 30), end: new Date(2026, 7, 1, 15, 0) };
    const style2 = getEventStyle(event2);
    assert.strictEqual(style2.top, '576px'); // (14.5-8)*80 + 56 = 6.5*80 + 56 = 520 + 56 = 576
    assert.strictEqual(style2.height, '40px'); // 0.5*80 = 40
  });
});
