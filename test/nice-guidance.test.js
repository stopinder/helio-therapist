import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNiceSearchUrl, buildNiceGuidanceReply, isNiceGuidanceRequest, researchReferenceHeading,
  NICE_GUIDANCE_URL, NICE_SEARCH_URL, NICE_TOPIC_MAX_LENGTH } from '../src/lib/niceGuidance.js';

test('NICE is a source choice, with no supported-diagnosis list', () => {
  for (const query of ['Find the current NICE guideline on treating OCD in adults.',
    'What does nice recommend about an unfamiliar topic?', 'NICE',
    'Compare NICE recommendations with recent studies.', 'Summarise nice guidelines',
    'National Institute for Health and Care Excellence recommendations', 'Open nice.org.uk']) {
    assert.equal(isNiceGuidanceRequest(query), true, query);
  }
  for (const query of ['I had a nice conversation', 'That was nice, thank you', 'Compare CBT and psychodynamic therapy',
    'schizophrenia mortality', '', null, {}, 'NICE ' + 'x'.repeat(1200)]) {
    assert.equal(isNiceGuidanceRequest(query), false, String(query));
  }
});

test('external search URLs have a fixed official origin and encoded topic', () => {
  for (const topic of ['OCD adults', 'NG222', 'grief & loss', 'https://evil.test/?q=private#part', '<script>alert(1)</script>']) {
    const url = new URL(buildNiceSearchUrl(topic));
    assert.equal(url.origin, 'https://www.nice.org.uk');
    assert.equal(url.pathname, '/search');
    assert.deepEqual([...url.searchParams.keys()], ['q']);
    assert.equal(url.searchParams.get('q'), topic);
    assert.equal(url.hash, '');
  }
  assert.equal(buildNiceSearchUrl(''), NICE_SEARCH_URL);
  assert.equal(buildNiceSearchUrl({}), NICE_SEARCH_URL);
  assert.equal(new URL(buildNiceSearchUrl('x'.repeat(500))).searchParams.get('q').length, NICE_TOPIC_MAX_LENGTH);
  assert.equal(new URL(buildNiceSearchUrl('  OCD\n  adults\u0000 ')).searchParams.get('q'), 'OCD adults');
});

test('chat replies use fixed links, not private query text or fabricated recommendations', () => {
  const reply = buildNiceGuidanceReply('Fictional Name example@example.test');
  assert.equal(reply.aiAllowanceUsed, false);
  assert.equal(reply.sourceAccess.contentRetrieved, false);
  assert.match(reply.answer, /has not retrieved or read/);
  assert.match(reply.answer, /separate literature question/);
  assert.ok(reply.references.every(item => item.kind === 'external_guidance'));
  assert.deepEqual(reply.references.map(item => item.url), [NICE_GUIDANCE_URL, NICE_SEARCH_URL]);
  assert.doesNotMatch(JSON.stringify(reply), /Fictional Name|example@example|REF-/);
  assert.equal(researchReferenceHeading(reply.references), 'Official guidance links (not read by Helios)');
  assert.equal(researchReferenceHeading([{ title: 'Paper' }]), 'References');
});

test('link-only module has no network, model, storage, or secret dependency', () => {
  const code = readFileSync(new URL('../src/lib/niceGuidance.js', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /\b(?:fetch|runTextAI|runResearchAI|localStorage|sessionStorage)\s*\(/);
  assert.doesNotMatch(code, /process\.env|OPENAI_API_KEY|SUPABASE/);
});

test('explicit NICE requests route to Research even from Workspace or Reflect', async () => {
  const { resolveAskHeliosMode, isClearlyWorkspaceQuestion } = await import('../src/lib/askHeliosIntent.js');
  for (const mode of ['workspace', 'research', 'reflect']) {
    assert.equal(resolveAskHeliosMode('Find NICE guidance for my practice', mode), 'research');
    assert.equal(resolveAskHeliosMode('What does NICE recommend about confidentiality?', mode), 'research');
  }
  assert.equal(isClearlyWorkspaceQuestion('Find my NICE guidance documents'), false);
  assert.equal(resolveAskHeliosMode('Find my consent forms', 'research'), 'workspace');
  assert.equal(resolveAskHeliosMode('I had a nice conversation', 'reflect'), 'reflect');
});

test('NICE references retain source labels after saved-history JSON roundtrip', () => {
  const saved = JSON.parse(JSON.stringify({ citation_metadata: buildNiceGuidanceReply().references }));
  assert.equal(researchReferenceHeading(saved.citation_metadata), 'Official guidance links (not read by Helios)');
  assert.ok(saved.citation_metadata.every(reference => new URL(reference.url).hostname === 'www.nice.org.uk'));
});
