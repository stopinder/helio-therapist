import assert from 'node:assert';
import test from 'node:test';
import { 
  aiRephraseSystemPrompt, 
  validateAIRephraseResponse 
} from '../api/_lib/ai-rephrase.js';

test('AI Rephrase Library: validateAIRephraseResponse handles valid input', () => {
  const validResponse = JSON.stringify({
    rephrased_text: 'Suggested rephrasing content.',
    explanation: 'Brief explanation.'
  });

  const validated = validateAIRephraseResponse(validResponse);
  assert.ok(validated);
  assert.strictEqual(validated.rephrased_text, 'Suggested rephrasing content.');
  assert.strictEqual(validated.explanation, 'Brief explanation.');
});

test('AI Rephrase Library: validateAIRephraseResponse fails on missing rephrased_text', () => {
  const invalidResponse = JSON.stringify({
    explanation: 'Only explanation'
  });
  const validated = validateAIRephraseResponse(invalidResponse);
  assert.strictEqual(validated, null);
});

test('AI Rephrase Library: validateAIRephraseResponse trims and limits strings', () => {
  const longText = 'a'.repeat(3000);
  const longExp = 'b'.repeat(500);
  const response = {
    rephrased_text: longText,
    explanation: longExp
  };
  const validated = validateAIRephraseResponse(response);
  assert.strictEqual(validated.rephrased_text.length, 2000);
  assert.strictEqual(validated.explanation.length, 300);
});

test('AI Rephrase Library: System Prompt contents', () => {
  assert.ok(aiRephraseSystemPrompt.includes('suggest alternative wording'));
  assert.ok(aiRephraseSystemPrompt.includes('retaining the therapist\'s original meaning'));
  assert.ok(aiRephraseSystemPrompt.includes('DO NOT change the core meaning'));
  assert.ok(aiRephraseSystemPrompt.includes('DO NOT add clinical interpretations'));
  assert.ok(aiRephraseSystemPrompt.includes('return structured JSON only'));
});
