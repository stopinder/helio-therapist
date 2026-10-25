import test from 'node:test';
import assert from 'node:assert/strict';
import { isClearlyWorkspaceQuestion, resolveAskHeliosMode, decideAskHeliosRoute } from '../src/lib/askHeliosIntent.js';

test('the reported weekly-attention question always resolves to Workspace', () => {
  for (const selected of ['research', 'reflect', 'workspace', null]) {
    assert.equal(resolveAskHeliosMode('What needs my attention this week?', selected), 'workspace');
  }
});

test('high-confidence practice-management questions do not use literature research', () => {
  const questions = [
    'What needs my attention this week?',
    'What do I need to do this week?',
    'Show my appointments tomorrow',
    'Which of my clients need attention?',
    'Show my unfinished sessions',
    'Find my notes from last Tuesday',
    'Open my documents',
    'Remind me to write my CPD reflection',
    'Prepare for my next session',
    'What reminders are on my list?',
    'Find my consent forms and documents.',
    'Find my signed consent form',
    'Show me my intake paperwork',
    'Where are my client documents?',
    'Find my clinical assessment templates',
    'Show my consent agreements'
  ];
  for (const question of questions) {
    assert.equal(isClearlyWorkspaceQuestion(question), true, question);
    assert.equal(resolveAskHeliosMode(question, 'research'), 'workspace', question);
  }
});

test('research questions retain the explicitly selected Research mode', () => {
  const questions = [
    'What do systematic reviews say about ERP for OCD?',
    'What evidence supports exposure and response prevention?',
    'What research addresses ADHD treatment?',
    'What does the literature say about appointment reminders?',
    'Find studies on therapist burnout and session preparation',
    'What does research say about informed consent forms in psychotherapy?',
    'Find papers about clinical consent forms and privacy'
  ];
  for (const query of questions) {
    assert.equal(isClearlyWorkspaceQuestion(query), false, query);
    assert.equal(resolveAskHeliosMode(query, 'research'), 'research', query);
  }
});

test('Reflect remains available for genuinely reflective questions', () => {
  assert.equal(resolveAskHeliosMode('Help me understand why I felt impatient', 'reflect'), 'reflect');
  assert.equal(resolveAskHeliosMode('What would I like to learn from this?', 'reflect'), 'reflect');
});

test('explicit literature intent overrides Workspace and contextual document follow-ups keep their task', () => {
  assert.deepEqual(decideAskHeliosRoute('What does the research say about consent forms?', 'workspace'), {
    mode: 'research', reason: 'explicit-literature-intent', confidence: 'high'
  });
  assert.deepEqual(decideAskHeliosRoute('Open the first one', 'research', { lastWorkspaceTask: 'documents' }), {
    mode: 'workspace', reason: 'document-follow-up', confidence: 'high'
  });
  assert.deepEqual(decideAskHeliosRoute('Hello there', 'workspace'), {
    mode: 'workspace', reason: 'selected-mode', confidence: 'low'
  });
});
test('unknown input and unspecified mode fail safely to Workspace', () => {
  assert.equal(isClearlyWorkspaceQuestion(null), false);
  assert.equal(isClearlyWorkspaceQuestion({ query: 'What needs my attention?' }), false);
  assert.equal(isClearlyWorkspaceQuestion(' '.repeat(1500)), false);
  assert.equal(resolveAskHeliosMode('Hello', 'not-a-mode'), 'workspace');
  assert.equal(resolveAskHeliosMode('Hello', null), 'workspace');
});
