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

test('AI Reflection Library: validateAIReflectionResponse handles malformed arrays', () => {
  const malformedResponse = {
    reflective_questions: "not an array",
    possible_themes: [],
    alternative_perspectives: 123,
    ethical_considerations: {},
    learning_points: undefined,
    limitations: "Still valid string"
  };
  // Note: the current logic returns null if ANY required field is missing/null/undefined.
  // We need to provide all required fields (even if they are the wrong type) to avoid returning null early.
  const malformedButComplete = {
    reflective_questions: "not an array",
    possible_themes: null, // this will cause it to return null based on the loop
    alternative_perspectives: 123,
    ethical_considerations: {},
    learning_points: [],
    limitations: "Still valid string"
  };
  
  // Let's adjust the test to match the code or vice versa.
  // Actually, let's fix the test to provide all keys.
  const testInput = {
    reflective_questions: "not an array",
    possible_themes: "not an array",
    alternative_perspectives: 123,
    ethical_considerations: {},
    learning_points: [],
    limitations: "Still valid string"
  };

  const validated = validateAIReflectionResponse(testInput);
  assert.ok(validated);
  assert.strictEqual(validated.reflective_questions.length, 0);
  assert.strictEqual(validated.possible_themes.length, 0);
  assert.strictEqual(validated.limitations, "Still valid string");
});

test('AI Reflection Library: validateAIReflectionResponse trims and limits strings', () => {
  const longString = 'a'.repeat(1000);
  const response = {
    reflective_questions: [longString],
    possible_themes: [{ theme: longString, reason: longString }],
    alternative_perspectives: [longString],
    ethical_considerations: [longString],
    learning_points: [longString],
    limitations: longString
  };
  const validated = validateAIReflectionResponse(response);
  assert.strictEqual(validated.reflective_questions[0].length, 500);
  assert.strictEqual(validated.possible_themes[0].theme.length, 100);
  assert.strictEqual(validated.possible_themes[0].reason.length, 300);
  assert.strictEqual(validated.limitations.length, 500);
});

test('AI Reflection Library: System Prompt contents', () => {
  assert.ok(aiReflectionSystemPrompt.includes('support the therapist\'s own reflective practice'));
  assert.ok(aiReflectionSystemPrompt.includes('DO NOT diagnose'));
  assert.ok(aiReflectionSystemPrompt.includes('DO NOT make definitive ethical rulings'));
  assert.ok(aiReflectionSystemPrompt.includes('cautious, tentative language'));
  assert.ok(aiReflectionSystemPrompt.includes('return structured JSON only'));
});
