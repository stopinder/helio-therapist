import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultPreparation, validatePreparation, selectDocumentSessions, clientSummaryPreparation, DOCUMENT_SECTIONS } from '../src/lib/documentPreparation.js';
import { preparedDocumentPrompt, validatePreparedDocument } from '../api/_lib/ai-prepared-document.js';
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const options = (extra = {}) => validatePreparation({ ...defaultPreparation('working_formulation'), clientId: id(99), ...extra });
const sessions = [1, 2, 3].map(n => ({ sessionId: id(n), occurredAt: `2026-10-0${n}T10:00:00Z`, reviewedAt: '2026-10-04T10:00:00Z' }));
const bundle = { manifest: sessions.map(s => ({ id: 'capture:' + s.sessionId, kind: 'session_capture', sessionId: s.sessionId, contentHash: s.sessionId })) };
const claim = (section, text, strength = 'current_observation', sourceIds = [bundle.manifest[0].id]) => ({ section, text, evidenceStrength: strength, sourceIds });
const output = () => ({ claims: [
  claim('observations', 'The client reported delaying a request after anticipating criticism.'),
  claim('understanding', 'Delay may limit opportunities to test that expectation in this situation.', 'tentative_connection'),
  claim('alternatives', 'The client also described one request that they did make.'),
  claim('uncertainties', 'The selected material does not establish what happened in other settings.', 'not_recorded')
] });
test('working formulation defaults to therapist use without changing facts or Care', () => {
  assert.equal(options().audience, 'therapist'); assert.equal(options().window, 'last_three');
  assert.equal(options().includeCare, false);
  assert.ok(DOCUMENT_SECTIONS.working_formulation.some(([key]) => key === 'alternatives'));
});
test('client-facing formulations and raw-transcript requests are rejected by the contract', () => {
  assert.throws(() => options({ audience: 'client' }), { code: 'INVALID_PREPARATION' });
  assert.throws(() => options({ transcriptId: id(9) }), { code: 'INVALID_PREPARATION' });
});
test('one reviewed encounter supports only a provisional one-encounter formulation', () => {
  assert.deepEqual(selectDocumentSessions(sessions, options({ window: 'current', anchorSessionId: id(2) })).map(s => s.sessionId), [id(2)]);
  assert.equal(selectDocumentSessions([sessions[0]], options()).length, 1);
});
test('unreviewed anchors and future encounters never enter a formulation', () => {
  assert.throws(() => selectDocumentSessions(sessions.map(s => ({ ...s, reviewedAt: null })), options({ anchorSessionId: id(2) })), { code: 'UNREVIEWED_ANCHOR' });
  assert.throws(() => selectDocumentSessions(sessions, options({ window: 'selected', anchorSessionId: id(2), selectedSessionIds: [id(2), id(3)] })), { code: 'FUTURE_SESSION' });
  assert.deepEqual(selectDocumentSessions(sessions, options({ anchorSessionId: id(2) })).map(s => s.sessionId), [id(2), id(1)]);
});
test('rendered formulation labels hypotheses and preserves contrary evidence and limits', () => {
  const result = validatePreparedDocument(output(), bundle, options());
  assert.match(result.body, /provisional, not a diagnosis/);
  assert.match(result.body, /Working interpretation:/);
  assert.match(result.body, /Alternatives and contrary evidence/);
  assert.match(result.body, /does not establish/);
});
test('a hypothesis cannot be structurally presented as recorded fact', () => {
  const value = output(); value.claims[1].evidenceStrength = 'current_observation';
  assert.throws(() => validatePreparedDocument(value, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
  value.claims[1].evidenceStrength = 'tentative_connection'; value.claims[1].section = 'observations';
  assert.throws(() => validatePreparedDocument(value, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
});
test('formulations require an observation from a reviewed capture and an uncertainty', () => {
  for (const missing of ['observations', 'uncertainties']) {
    const value = output(); value.claims = value.claims.filter(c => c.section !== missing);
    assert.throws(() => validatePreparedDocument(value, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
  }
});
test('invented sources, duplicated filler and false recurrence fail structural validation', () => {
  const value = output(); value.claims[0].sourceIds = ['made-up'];
  assert.throws(() => validatePreparedDocument(value, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
  const repeated = output(); repeated.claims.push(repeated.claims[0]);
  assert.throws(() => validatePreparedDocument(repeated, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
  const recurring = output(); recurring.claims[0].evidenceStrength = 'recurring';
  assert.throws(() => validatePreparedDocument(recurring, bundle, options()), { code: 'INVALID_AI_RESPONSE' });
});
test('existing client-summary boundaries still reject new psychological hypotheses', () => {
  assert.throws(() => validatePreparedDocument({ claims: [claim('noticed', 'A possible cause.', 'tentative_connection')] }, bundle,
    { ...defaultPreparation(), clientId: id(99) }), { code: 'INVALID_AI_RESPONSE' });
});
test('all formulation lenses retain contrary evidence, uncertainty and prompt-injection boundaries', () => {
  for (const lens of ['general', 'gentle_cbt', 'transactional_analysis', 'integrative']) {
    const prompt = preparedDocumentPrompt(options({ lens }));
    assert.match(prompt, /not the underlying facts/); assert.match(prompt, /contradictory evidence/);
    assert.match(prompt, /uncertainties/); assert.match(prompt, /untrusted clinical DATA/);
    assert.match(prompt, /not.*causal proof/); assert.match(prompt, /No content is automatically accepted into Care/);
  }
});
test('a separate client draft carries source metadata, never internal text or private additions', () => {
  const seed = clientSummaryPreparation({ anchorSessionId: id(3), selectedSessionIds: [id(3), id(2)], lens: 'gentle_cbt',
    documentPurpose: 'working_formulation', audience: 'therapist', body: 'PRIVATE HYPOTHESIS', claims: ['PRIVATE'],
    therapistGuidance: 'PRIVATE ADDITIONS', includeCare: true, history: ['PRIVATE'] });
  assert.equal(seed.documentPurpose, 'recent_review'); assert.equal(seed.audience, 'client'); assert.equal(seed.window, 'selected');
  assert.equal(seed.includeCare, false); assert.equal(seed.therapistGuidance, '');
  assert.deepEqual(seed.selectedSessionIds, [id(3), id(2)]); assert.doesNotMatch(JSON.stringify(seed), /PRIVATE/);
  assert.equal(clientSummaryPreparation({ anchorSessionId: id(1), selectedSessionIds: [id(1)] }).documentPurpose, 'session_summary');
});
test('client draft creation fails with missing or forged source-selection metadata', () => {
  for (const generation of [null, {}, { anchorSessionId: id(2), selectedSessionIds: [id(1)] }, { anchorSessionId: 'bad', selectedSessionIds: ['bad'] }]) {
    assert.throws(() => clientSummaryPreparation(generation), { code: 'INVALID_PREPARATION' });
  }
});
test('Summary options mounts inline, not the full-screen composer', async () => {
  const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8');
  assert.match(source, /<InlineDocumentWorkbench/); assert.doesNotMatch(source, /<ClientDocumentComposer/);
  assert.match(source, /aria-expanded="showDocumentPreparation"/);
  assert.match(source, /changeSessionView/);
});
test('advanced preparation and source details are collapsed by default', async () => {
  const source = await readFile(new URL('../src/components/workspace/DocumentPreparationPanel.vue', import.meta.url), 'utf8');
  assert.match(source, /Change sessions or add context/);
  assert.doesNotMatch(source, /<details[^>]*\sopen(?:\s|>)/);
});
