import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndFormatReferences } from '../api/_lib/ai-research.js';

// 1. Strict Numeric Citation Validation
test('Citation Validation: strictly numeric markers', () => {
  const mockContext = [
    { id: 'pmid:1', title: 'Paper 0', authors: 'A', year: 2020, journal: 'J', url: 'u0' },
    { id: 'pmid:2', title: 'Paper 1', authors: 'B', year: 2021, journal: 'J', url: 'u1' }
  ];

  const examples = [
    ['Valid [REF-0]', 'Valid [REF-0]', 1],
    ['Invalid [REF-X]', 'Invalid', 0],
    ['Malformed [REF-0abc]', 'Malformed', 0],
    ['Out of bounds [REF-99]', 'Out of bounds', 0],
    ['Mixed [REF-0] and [REF-X]', 'Mixed [REF-0] and', 1]
  ];

  for (const [input, expectedAnswer, expectedRefCount] of examples) {
    const res = validateAndFormatReferences({ answer: input, cited_refs: [] }, mockContext);
    assert.strictEqual(res.answer, expectedAnswer.trim(), `Failed for input: ${input}`);
    assert.strictEqual(res.references.length, expectedRefCount, `Ref count mismatch for input: ${input}`);
  }
});
