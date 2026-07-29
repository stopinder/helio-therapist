import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Mocking the state logic from ClinicalSummaryTab.vue
 */
function getStatus(session) {
  if (session.status === 'completed') {
    return 'approved_record';
  }
  if (!session.notes) {
    return 'not_started';
  }
  return 'draft'; // or 'ready_for_review' if we had a flag in session
}

function parseNotes(notes) {
  if (!notes) return { content: {}, legacyNotes: '' };
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') {
      const { legacyNotes, ...content } = parsed;
      return { content, legacyNotes: legacyNotes || '' };
    }
    return { content: {}, legacyNotes: notes };
  } catch (e) {
    return { content: {}, legacyNotes: notes };
  }
}

test('Clinical Summary Approval: draft session displays as draft', () => {
  const session = { status: 'in_progress', notes: '{"presentingConcerns":"Anxiety"}' };
  assert.equal(getStatus(session), 'draft');
});

test('Clinical Summary Approval: completed session displays as approved_record', () => {
  const session = { status: 'completed', notes: '{"presentingConcerns":"Anxiety"}' };
  assert.equal(getStatus(session), 'approved_record');
});

test('Clinical Summary Approval: parses notes correctly for approved record', () => {
  const session = { 
    status: 'completed', 
    notes: JSON.stringify({ presentingConcerns: 'Fixed', legacyNotes: 'Old' }),
    completedAt: '2026-07-28T10:00:00Z'
  };
  
  const { content, legacyNotes } = parseNotes(session.notes);
  assert.equal(content.presentingConcerns, 'Fixed');
  assert.equal(legacyNotes, 'Old');
  assert.equal(getStatus(session), 'approved_record');
});

test('Clinical Summary Approval: handles legacy plain text after approval', () => {
  const session = { 
    status: 'completed', 
    notes: 'Legacy manual note',
    completedAt: '2026-07-28T10:00:00Z'
  };
  
  const { content, legacyNotes } = parseNotes(session.notes);
  assert.deepEqual(content, {});
  assert.equal(legacyNotes, 'Legacy manual note');
});
