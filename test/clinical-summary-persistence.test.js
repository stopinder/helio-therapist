import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Mock logic for ClinicalSummaryTab.vue persistence
 */
function parseNotes(notes) {
  if (!notes) return { summaryData: {}, legacyNotes: '' };
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') {
      const { legacyNotes, ...summaryData } = parsed;
      return { summaryData, legacyNotes: legacyNotes || '' };
    }
    return { summaryData: {}, legacyNotes: notes };
  } catch (e) {
    return { summaryData: {}, legacyNotes: notes };
  }
}

function formatNotes(summaryData, legacyNotes) {
  return JSON.stringify({
    ...summaryData,
    legacyNotes: legacyNotes || ''
  });
}

test('Clinical Summary: parses valid JSON notes', () => {
  const notes = JSON.stringify({
    presentingConcerns: 'Anxiety',
    sessionThemes: 'Work',
    legacyNotes: 'Old text'
  });
  const { summaryData, legacyNotes } = parseNotes(notes);
  assert.equal(summaryData.presentingConcerns, 'Anxiety');
  assert.equal(summaryData.sessionThemes, 'Work');
  assert.equal(legacyNotes, 'Old text');
});

test('Clinical Summary: handles plain text as legacy notes', () => {
  const notes = 'Just some plain text';
  const { summaryData, legacyNotes } = parseNotes(notes);
  assert.deepEqual(summaryData, {});
  assert.equal(legacyNotes, 'Just some plain text');
});

test('Clinical Summary: handles invalid JSON as legacy notes', () => {
  const notes = '{ invalid json';
  const { summaryData, legacyNotes } = parseNotes(notes);
  assert.deepEqual(summaryData, {});
  assert.equal(legacyNotes, '{ invalid json');
});

test('Clinical Summary: formats data as JSON string', () => {
  const data = { presentingConcerns: 'Depression' };
  const legacy = 'Previous notes';
  const formatted = formatNotes(data, legacy);
  const parsed = JSON.parse(formatted);
  assert.equal(parsed.presentingConcerns, 'Depression');
  assert.equal(parsed.legacyNotes, 'Previous notes');
});
