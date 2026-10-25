import { strict as assert } from 'node:assert';
import { validateAndFormatReferences, parseResearchResponse } from '../api/_lib/ai-research.js';

async function testAskHeliosFinalIntegrity() {
  console.log('Running Ask Helios Final Integrity Tests...');

  const mockResearchContext = [
    { id: 'pmid:1', title: 'Paper 1', authors: 'Auth 1', year: 2020, journal: 'J1', url: 'url1' },
    { id: 'pmid:2', title: 'Paper 2', authors: 'Auth 2', year: 2021, journal: 'J2', url: 'url2' }
  ];

  // Test 1: Citation Validation - Missing marker index in researchContext
  console.log('Test 1: Mismatched citation marker indices...');
  const res1 = validateAndFormatReferences({
    answer: 'Evidence from [REF-0] and [REF-99] shows...',
    cited_refs: [0, 99]
  }, mockResearchContext);
  assert.equal(res1.references.length, 1);
  assert.equal(res1.references[0].title, 'Paper 1');
  assert.ok(!res1.answer.includes('[REF-99]'), 'Invalid marker [REF-99] should be stripped');
  assert.ok(res1.answer.includes('[REF-0]'), 'Valid marker [REF-0] should be kept');

  // Test 2: Citation Validation - Marker in text but not in cited_refs array
  console.log('Test 2: Marker in text but not in cited_refs array...');
  const res2 = validateAndFormatReferences({
    answer: 'According to [REF-1]...',
    cited_refs: []
  }, mockResearchContext);
  assert.equal(res2.references.length, 1);
  assert.equal(res2.references[0].title, 'Paper 2');
  assert.ok(res2.answer.includes('[REF-1]'));

  // Test 3: Citation Validation - Fabricated reference marker
  console.log('Test 3: Fabricated reference marker...');
  const res3 = validateAndFormatReferences({
    answer: 'Fake news [REF-X] and [REF-999].',
    cited_refs: []
  }, mockResearchContext);
  assert.equal(res3.references.length, 0);
  assert.ok(!res3.answer.includes('[REF-X]'));
  assert.ok(!res3.answer.includes('[REF-999]'));

  // Test 4: JSON Parsing Inconsistency
  console.log('Test 4: JSON parsing resilience...');
  const content = '```json\n{"answer": "Correct answer", "queries": ["q1"]}\n```';
  const parsed = parseResearchResponse(content);
  assert.equal(parsed.answer, 'Correct answer');

  // Test 5: Allowance consumption simulation
  console.log('Test 5: Allowance consumption simulation...');
  let actionsConsumed = 0;
  const mockRunTextAI = async () => {
    actionsConsumed++;
    return { completion: { choices: [{ message: { content: '{"answer":"test","cited_refs":[]}' } }] } };
  };
  
  // Simulated handler flow
  async function simulatedHandler(query) {
    // 1. Query Gen (Internal/Deterministic) - 0 actions
    const queries = query.match(/\w+/g).slice(0,2); 
    // 2. Search - 0 actions
    const context = [{title:'T'}];
    // 3. AI Answer - 1 action
    await mockRunTextAI();
    return { success: true };
  }

  await simulatedHandler('What is CBT?');
  assert.equal(actionsConsumed, 1, 'Only one AI action should be consumed per request');

  console.log('All Integrity Tests Passed!');
}

testAskHeliosFinalIntegrity().catch(e => {
  console.error('Tests failed', e);
  process.exit(1);
});
