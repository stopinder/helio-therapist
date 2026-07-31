import assert from 'node:assert';
import test from 'node:test';
import { 
  aiReflectionSystemPrompt, 
  validateAIReflectionResponse, 
  buildReflectionInput 
} from '../api/_lib/ai-reflection.js';

test('AI Reflection Library: buildReflectionInput', () => {
  const reflection = {
    body: 'Test body',
    theme: 'Test theme',
    supervision_question: 'Test question'
  };
  const input = buildReflectionInput(reflection);
  assert.ok(input.includes('Reflection: Test body'));
  assert.ok(input.includes('Theme: Test theme'));
  assert.ok(input.includes('Supervision Question: Test question'));
});

test('AI Reflection Library: buildReflectionInput with minimal data', () => {
  const reflection = {
    body: 'Only body'
  };
  const input = buildReflectionInput(reflection);
  assert.strictEqual(input, 'Reflection: Only body');
});

test('AI Reflection Library: validateAIReflectionResponse handles valid input', () => {
  const validResponse = JSON.stringify({
    reflective_questions: ['Q1', 'Q2', 'Q3', 'Q4'],
    possible_themes: [
      { theme: 'T1', reason: 'R1' },
      { theme: 'T2', reason: 'R2' },
      { theme: 'T3', reason: 'R3' },
      { theme: 'T4', reason: 'R4' }
    ],
    alternative_perspectives: ['P1', 'P2', 'P3'],
    ethical_considerations: ['E1', 'E2', 'E3'],
    learning_points: ['L1', 'L2', 'L3'],
    limitations: 'Limited'
  });

  const validated = validateAIReflectionResponse(validResponse);
  assert.ok(validated);
  assert.strictEqual(validated.reflective_questions.length, 3);
  assert.strictEqual(validated.possible_themes.length, 3);
  assert.strictEqual(validated.alternative_perspectives.length, 2);
  assert.strictEqual(validated.ethical_considerations.length, 2);
  assert.strictEqual(validated.learning_points.length, 2);
  assert.strictEqual(validated.limitations, 'Limited');
});

test('AI Reflection Library: validateAIReflectionResponse fails on missing fields', () => {
  const invalidResponse = JSON.stringify({
    reflective_questions: ['Q1']
    // missing other fields
  });
  const validated = validateAIReflectionResponse(invalidResponse);
  assert.strictEqual(validated, null);
});

test('AI Reflection Library: System Prompt contents', () => {
  assert.ok(aiReflectionSystemPrompt.includes('support the therapist\'s own reflective practice'));
  assert.ok(aiReflectionSystemPrompt.includes('DO NOT diagnose'));
  assert.ok(aiReflectionSystemPrompt.includes('DO NOT make definitive ethical rulings'));
  assert.ok(aiReflectionSystemPrompt.includes('cautious, tentative language'));
  assert.ok(aiReflectionSystemPrompt.includes('return structured JSON only'));
});
