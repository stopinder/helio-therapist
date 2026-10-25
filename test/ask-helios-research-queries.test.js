import test from 'node:test';
import assert from 'node:assert/strict';
import { generateResearchQueries, selectResearchEvidence, isSystematicReview } from '../api/_lib/research-queries.js';
import { searchResearch } from '../api/_lib/research-retrieval.js';

const question = 'What is the evidence from systematic reviews for exposure and response prevention in treating OCD?';

test('Generates a targeted ERP + OCD + review query, not question preamble', () => {
  const queries = generateResearchQueries(question);
  assert.equal(queries.length, 1);
  assert.match(queries[0], /"exposure and response prevention"/i);
  assert.match(queries[0], /"obsessive-compulsive disorder"/i);
  assert.match(queries[0], /"systematic review"/i);
  assert.doesNotMatch(queries[0], /what is the evidence/i);
});

test('Compares IFS and ERP using separate searches with OCD as shared condition', () => {
  const queries = generateResearchQueries('What does research say about IFS versus ERP for OCD?');
  assert.equal(queries.length, 3);
  assert.ok(queries[0].includes('"internal family systems"') && queries[0].includes('"exposure and response prevention"'));
  assert.ok(queries.some(query => query.includes('"internal family systems"')));
  assert.ok(queries.some(query => query.includes('"exposure and response prevention"')));
  assert.ok(queries.every(query => query.includes('"obsessive-compulsive disorder"')));
});

test('Follow-up research queries inherit the prior therapy and condition', () => {
  const history = [{ role: 'user', content: 'What is ERP for OCD?' }];
  const queries = generateResearchQueries('And what do systematic reviews say?', history);
  assert.match(queries[0], /ERP/);
  assert.match(queries[0], /OCD/);
  assert.match(queries[0], /systematic review/);
});

test('Known review request uses only identified systematic reviews or meta-analyses', () => {
  const candidates = [
    { id:'pmid:33618297', title:'Cognitive behavioural therapy with exposure and response prevention: A systematic review and meta-analysis',url:'https://pubmed.ncbi.nlm.nih.gov/33618297/' },
    { id:'pmid:20',title:'Virtual reality OCD pilot trial',url:'https://pubmed.ncbi.nlm.nih.gov/20/' }
  ];
  assert.equal(isSystematicReview(candidates[0]), true);
  assert.equal(isSystematicReview(candidates[1]), false);
  assert.deepEqual(selectResearchEvidence(candidates, question).map(p => p.id), ['pmid:33618297']);
});

test('Review articles are recognised using publication types, even without review in title', () => {
  assert.ok(isSystematicReview({ title:'ERP for OCD', publicationTypes:['Systematic Review','Meta-Analysis'] }));
});

function responseJson(data) { return { ok:true, json: async () => data }; }
function responseText(data) { return { ok:true, text: async () => data }; }

test('Provider metadata retrieval yields an indexed systematic review and abstract', async () => {
  const original = globalThis.fetch;
  const called = [];
  try {
    globalThis.fetch = async url => {
      called.push(url);
      if (url.includes('/esearch.fcgi')) return responseJson({ esearchresult:{ idlist:['33618297'] } });
      if (url.includes('/esummary.fcgi')) return responseJson({ result:{ '33618297':{
        uid:'33618297',title:'CBT with ERP for OCD: systematic review and meta-analysis',
        authors:[{name:'Reid JE'}],fulljournalname:'Comprehensive Psychiatry',pubdate:'2021 Apr',
        pubtype:['Systematic Review','Meta-Analysis']
      }}});
      if (url.includes('/efetch.fcgi')) return responseText('<PubmedArticle><MedlineCitation><PMID>33618297</PMID><Article><Abstract><AbstractText>Review results from randomized controlled trials provide evidence for ERP in OCD.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>');
      if (url.includes('/search?')) return responseJson({resultList:{result:[]}});
      throw new Error('unexpected external request');
    };
    const results = await searchResearch(generateResearchQueries(question)[0]);
    assert.equal(results.length, 1);
    assert.equal(results[0].pmid, '33618297');
    assert.equal(results[0].year, '2021');
    assert.match(results[0].abstract, /randomized controlled trials/);
    assert.deepEqual(selectResearchEvidence(results, question).map(p => p.pmid), ['33618297']);
    assert.ok(called.some(url => url.includes('sort=relevance')), 'PubMed search should request best-match sorting');
  } finally { globalThis.fetch = original; }
});

test('One provider offline still retains publications from the other', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      if (url.includes('eutils.ncbi.nlm.nih.gov')) throw new Error('PubMed offline');
      return responseJson({resultList:{result:[{
        id:'PMC9520065',pmcid:'PMC9520065',title:'ERP for OCD: systematic review',
        authorString:'Author A',journalTitle:'Clinical Reviews',pubYear:'2022',
        abstractText:'This paper systematically reviews ERP evidence.'
      }]}});
    };
    const results = await searchResearch(generateResearchQueries(question)[0]);
    assert.equal(selectResearchEvidence(results, question).length, 1);
  } finally { globalThis.fetch = original; }
});

test('Both providers offline propagates a research-service failure', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('upstream offline'); };
    await assert.rejects(searchResearch('OCD'), { status:502 });
  } finally { globalThis.fetch = original; }
});

test('CBT versus psychodynamic therapy searches head-to-head studies and both arms', () => {
  const queries = generateResearchQueries('Compare evidence for CBT and psychodynamic therapy');
  assert.equal(queries.length, 3);
  assert.match(queries[0], /cognitive behavioral therapy/i);
  assert.match(queries[0], /psychodynamic/i);
  assert.ok(queries.slice(1).some(q => /CBT/.test(q) && !/psychodynamic/.test(q)));
  assert.ok(queries.slice(1).some(q => /psychodynamic/.test(q) && !/CBT/.test(q)));
});

test('Comparative evidence selection prioritises direct trials and retains both approaches', () => {
  const make = (id, title, abstract) => ({ id, title, abstract, url:'https://example.org/' + id });
  const results = [
    ...Array.from({ length: 7 }, (_, i) => make('cbt' + i, 'CBT for depression trial ' + i, 'CBT treatment outcomes')),
    make('psychodynamic', 'Psychodynamic psychotherapy outcomes', 'Psychodynamic treatment'),
    make('direct', 'CBT compared with psychodynamic therapy: randomized trial', 'Direct comparison of CBT and psychodynamic therapy')
  ];
  const selected = selectResearchEvidence(results, 'Compare evidence for CBT and psychodynamic therapy');
  assert.equal(selected.length, 6);
  assert.equal(selected[0].id, 'direct');
  assert.ok(selected.some(r => r.id === 'psychodynamic'));
  assert.ok(selected.some(r => r.id.startsWith('cbt')));
});

test('Review-only comparisons do not silently substitute ordinary trials', () => {
  const results = [
    { id:'trial', title:'CBT versus psychodynamic therapy trial', url:'https://example.org/trial' },
    { id:'review', title:'Psychodynamic therapy systematic review', url:'https://example.org/review' }
  ];
  assert.deepEqual(selectResearchEvidence(results, 'Compare CBT and psychodynamic therapy systematic reviews').map(r => r.id), ['review']);
});

test('Schizophrenia mortality uses epidemiological outcomes rather than generic words', () => {
  const queries = generateResearchQueries('What are the mortality rates for those people diagnosed with schizophrenia?');
  assert.equal(queries.length, 3);
  assert.ok(queries.every(q => /schizophrenia/i.test(q)));
  assert.ok(queries.some(q => /standardized mortality ratio/i.test(q)));
  assert.ok(queries.some(q => /life expectancy/i.test(q)));
  assert.ok(queries.every(q => !/rates people diagnosed/i.test(q)));
});

test('Mortality evidence ranking favours outcome-relevant papers', () => {
  const make = (id, title, abstract) => ({ id, title, abstract, url: 'https://example.org/' + id });
  const selected = selectResearchEvidence([
    make('general', 'Schizophrenia symptoms', 'Psychiatric presentation'),
    make('mortality', 'Schizophrenia mortality: systematic review', 'All-cause mortality and standardized mortality ratio')
  ], 'What are mortality rates for schizophrenia?');
  assert.equal(selected[0].id, 'mortality');
});
