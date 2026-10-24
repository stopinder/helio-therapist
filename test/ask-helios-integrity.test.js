import test from 'node:test';
import assert from 'node:assert';
import { searchResearch } from '../api/_lib/research-retrieval.js';
import { buildResearchAssistantPrompt, validateAndFormatReferences } from '../api/_lib/ai-research.js';

test('Ask Helios Integrity: Research Retrieval', async (t) => {
  await t.test('searchResearch returns normalized results from PubMed/Europe PMC', async () => {
    // Note: In CI we might want to mock these, but for this integrity test we check normalization
    const results = await searchResearch('cbt for depression');
    assert(Array.isArray(results), 'Should return an array');
    if (results.length > 0) {
      const first = results[0];
      assert(first.id, 'Result should have an ID');
      assert(first.title, 'Result should have a title');
      assert(first.url, 'Result should have a URL');
      assert(first.source, 'Result should have a source (PubMed or Europe PMC)');
    }
  });

  await t.test('searchResearch deduplicates results', async () => {
    // Mocking might be needed for perfect dedupe test, but we verify the logic
    const results = await searchResearch('depression');
    const ids = results.map(r => r.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'IDs should be unique');
  });
});

test('Ask Helios Integrity: Citation Validation', async (t) => {
  const mockContext = [
    { id: 'pmid:1', title: 'Paper 1', authors: 'Auth A', year: 2023, journal: 'J1', url: 'http://ref1' },
    { id: 'pmid:2', title: 'Paper 2', authors: 'Auth B', year: 2022, journal: 'J2', url: 'http://ref2' }
  ];

  await t.test('validateAndFormatReferences filters out fabricated references', () => {
    const aiResponse = {
      answer: 'According to [REF-0] and [REF-99]...',
      cited_refs: [0, 99]
    };

    const validated = validateAndFormatReferences(aiResponse, mockContext);
    assert.strictEqual(validated.references.length, 1, 'Fabricated REF-99 should be filtered out');
    assert.strictEqual(validated.references[0].id, 'pmid:1');
    assert.strictEqual(validated.references[0].url, 'http://ref1');
  });

  await t.test('validateAndFormatReferences builds correct citation strings', () => {
    const aiResponse = {
      answer: 'Evidence shows X [REF-1].',
      cited_refs: [1]
    };

    const validated = validateAndFormatReferences(aiResponse, mockContext);
    assert.strictEqual(validated.references[0].citation, 'Auth B (2022). Paper 2. J2.');
  });
});

test('Ask Helios Integrity: Prompt Construction', async (t) => {
  await t.test('buildResearchAssistantPrompt includes context and history', () => {
    const prompt = buildResearchAssistantPrompt({
      query: 'Test query',
      history: [{ role: 'user', content: 'Hi' }],
      researchContext: [{ title: 'Context Paper', authors: 'Auth C', year: 2021, journal: 'J3' }]
    });

    assert(prompt.includes('Test query'), 'Prompt should include query');
    assert(prompt.includes('USER: Hi'), 'Prompt should include history');
    assert(prompt.includes('TITLE: Context Paper'), 'Prompt should include context');
  });
});
