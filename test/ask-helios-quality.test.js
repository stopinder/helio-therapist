import assert from 'node:assert';
const providerFixture=async url=>({ok:true,text:async()=>url.includes('/esearch.fcgi')?JSON.stringify({esearchresult:{idlist:[]}}):JSON.stringify({resultList:{result:[{pmid:'42',title:'Synthetic publication',authorString:'Researcher',pubYear:'2024',abstractText:'A synthetic abstract used to verify normalization and citation behavior without depending on external provider availability.'}]}})});
import { searchResearch } from '../api/_lib/research-retrieval.js';
import { buildResearchAssistantPrompt, parseResearchResponse, validateAndFormatReferences } from '../api/_lib/ai-research.js';

async function testRetrievalQuality() {
  console.log('Testing research retrieval quality...');

  // Test 1: Deduplication
  const results = await searchResearch('CBT for depression',{fetchImpl:providerFixture,throttle:false});
  console.log(`Found ${results.length} results for 'CBT for depression'`);
  
  const seenIds = new Set();
  results.forEach(r => {
    assert.ok(!seenIds.has(r.id), `Duplicate ID found: ${r.id}`);
    seenIds.add(r.id);
  });
  console.log('✓ No duplicate IDs in results');

  // Test 2: Abstracts Presence
  const hasAbstracts = results.some(r => r.abstract && r.abstract.length > 50);
  if (hasAbstracts) {
    console.log('✓ Successfully retrieved abstracts for some results');
  } else {
    console.warn('! No substantial abstracts found in top results. This might happen depending on API response.');
  }

  // Test 3: Multiple query generation context
  const prompt = buildResearchAssistantPrompt({
    query: 'IFS vs ERP for OCD',
    researchContext: results
  });
  assert.ok(prompt.includes('EVIDENCE CONTEXT:'), 'Prompt should contain EVIDENCE CONTEXT');
  assert.ok(prompt.includes('[REF-0]'), 'Prompt should include reference placeholders');
  assert.ok(prompt.includes('Base clinical research claims ONLY on the retrieved publications'), 'Prompt must ground research claims in retrieved evidence');
  assert.ok(prompt.includes('If the user asks for systematic reviews'), 'Prompt must prioritise requested review evidence');
  console.log('✓ Prompt generation includes research context and treatment maturity guidance');
}

async function testFaultTolerance() {
  console.log('Testing retrieval fault tolerance...');
  const partial=async url=>{if(url.includes('ncbi.nlm.nih.gov'))throw new Error('Synthetic provider outage');return providerFixture(url)};
  const results=await searchResearch('CBT',{fetchImpl:partial,throttle:false});
  assert.ok(results.length>0,'A working provider should still supply evidence');
  await assert.rejects(searchResearch('CBT',{fetchImpl:async()=>{throw new Error('Synthetic outage')},throttle:false}),{status:502});
  console.log('Verified partial-provider fallback and explicit all-provider failure');
}

async function testCitationIntegrity() {
  console.log('Testing citation integrity...');

  const mockContext = [
    { id: 'pmid:1', title: 'Paper A', authors: 'Auth A', year: 2020, journal: 'Jour A', url: 'http://a' },
    { id: 'pmid:2', title: 'Paper B', authors: 'Auth B', year: 2021, journal: 'Jour B', url: 'http://b' }
  ];

  // AI hallucinated a third citation
  const aiResponse = {
    answer: 'Findings from [REF-0] and [REF-1]. Also invented [REF-2].',
    cited_refs: [0, 1, 2]
  };

  const validated = validateAndFormatReferences(aiResponse, mockContext);
  
  assert.strictEqual(validated.references.length, 2, 'Should only include 2 valid references');
  assert.strictEqual(validated.references[0].id, 'pmid:1');
  assert.strictEqual(validated.references[1].id, 'pmid:2');
  console.log('✓ Correctly filtered out hallucinated citation index');
}

async function runTests() {
  try {
    await testRetrievalQuality();
    await testFaultTolerance();
    await testCitationIntegrity();
    console.log('\nAsk Helios Quality Tests PASSED');
  } catch (e) {
    console.error('\nAsk Helios Quality Tests FAILED');
    console.error(e);
    process.exit(1);
  }
}

runTests();
