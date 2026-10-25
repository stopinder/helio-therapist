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
