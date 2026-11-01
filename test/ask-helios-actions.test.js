import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHeliosAction } from '../api/ai/actions.js';

test('No action is valid without an explicit confirmation', () => {
  assert.equal(validateHeliosAction({ type: 'create_reminder', body: 'Review notes', confirmed: false }), null);
  assert.equal(validateHeliosAction({ type: 'create_reminder', body: 'Review notes' }), null);
  assert.equal(validateHeliosAction({ type: 'save_private_reflection', body: 'I want to think about my response to uncertainty.' }), null);
});
test('Only allowlisted reminder and private professional reflection actions', () => {
  assert.deepEqual(validateHeliosAction({ type: 'create_reminder', body: '  Review notes  ', confirmed: true }),
    { type: 'create_reminder', body: 'Review notes' });
  assert.deepEqual(validateHeliosAction({ type: 'save_private_reflection', body: '  I noticed impatience in the meeting  ', confirmed: true }),
    { type: 'save_private_reflection', body: 'I noticed impatience in the meeting' });
  assert.equal(validateHeliosAction({ type: 'send_email', body: 'Do something', confirmed: true }), null);
  assert.equal(validateHeliosAction({ type: 'complete_session', body: 'Do something', confirmed: true }), null);
  assert.equal(validateHeliosAction({ type: 'create_reminder', body: 'a'.repeat(301), confirmed: true }), null);
  assert.equal(validateHeliosAction({ type: 'save_private_reflection', body: 'a'.repeat(4001), confirmed: true }), null);
  assert.equal(validateHeliosAction({ type: 'save_private_reflection', body: 'too short', confirmed: true }), null);
});


test('Structured Ask Helios reflection requires explicit therapist confirmation and a saved source conversation', () => {
  const base = {
    type: 'save_private_reflection_draft',
    sourceConversationId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    reflection: {
      stoodOut: 'I noticed myself rushing to offer a solution.',
      emotionalResponse: 'I felt urgency and a pull to reduce the discomfort.'
    },
    reflectiveMap: {
      innerPosition: 'Wanting to rescue',
      trigger: 'The client becoming distressed'
    },
    theme: 'Rescuing'
  };
  assert.equal(validateHeliosAction(base), null);
  const action = validateHeliosAction({ ...base, confirmed: true });
  assert.ok(action);
  assert.equal(action.type, 'save_private_reflection_draft');
  assert.equal(action.body, 'I noticed myself rushing to offer a solution.\n\nI felt urgency and a pull to reduce the discomfort.');
  assert.equal(action.reflectiveMap.innerPosition, 'Wanting to rescue');
  assert.equal(action.theme, 'Rescuing');
});

test('Structured reflection action rejects mapping-only or unowned-looking payloads at validation boundary', () => {
  assert.equal(validateHeliosAction({
    type: 'save_private_reflection_draft',
    confirmed: true,
    sourceConversationId: 'not-a-uuid',
    reflection: { stoodOut: 'A real reflection' },
    reflectiveMap: {}
  }), null);
  assert.equal(validateHeliosAction({
    type: 'save_private_reflection_draft',
    confirmed: true,
    sourceConversationId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    reflection: {},
    reflectiveMap: { innerPosition: 'Rescuer' }
  }), null);
});
