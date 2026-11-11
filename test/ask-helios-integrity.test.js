import test from 'node:test';
import assert from 'node:assert';
import { searchResearch } from '../api/_lib/research-retrieval.js';
import { buildResearchAssistantPrompt, validateAndFormatReferences } from '../api/_lib/ai-research.js';


const researchFixture = async (url) => {
  const data = url.includes('/esearch.fcgi')
    ? { esearchresult: { idlist: ['123'] } }
    : url.includes('/esummary.fcgi')
      ? { result: { '123': { uid: '123', title: 'A trial of CBT', authors: [{ name: 'Researcher A' }], pubdate: '2024 Jan', fulljournalname: 'Journal of Therapy' } } }
      : url.includes('europepmc')
        ? { resultList: { result: [
            { pmid: '123', title: 'A trial of CBT', authorString: 'Researcher A', pubYear: '2024', abstractText: 'Research evidence.' },
            { pmid: '456', title: 'A second study', authorString: 'Researcher B', pubYear: '2023', abstractText: 'Other evidence.' }
          ] } }
        : null;
  if (url.includes('/efetch.fcgi')) return { ok: true, text: async () => '<PubmedArticle><PMID>123</PMID><AbstractText>CBT trial abstract.</AbstractText></PubmedArticle>' };
  if (!data) throw new Error('Unexpected research provider endpoint: ' + url);
  return { ok: true, text: async () => JSON.stringify(data) };
};

test('Ask Helios Integrity: Research Retrieval', async (t) => {
  await t.test('searchResearch returns normalized results from both providers without external network dependency', async () => {
    const results = await searchResearch('cbt for depression', { fetchImpl: researchFixture, throttle: false });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(item => item.id).sort(), ['pmid:123','pmid:456']);
    for (const result of results) {
      assert.ok(result.title && result.url && result.source);
      assert.match(result.url, /^https:\/\//);
      assert.ok(['PubMed','Europe PMC'].includes(result.source));
    }
  });

  await t.test('searchResearch deduplicates PubMed and Europe PMC records sharing a PMID', async () => {
    const results = await searchResearch('depression', { fetchImpl: researchFixture, throttle: false });
    assert.equal(results.filter(result => result.id === 'pmid:123').length, 1);
    assert.equal(new Set(results.map(result => result.id)).size, results.length);
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
