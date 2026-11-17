import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACROSS_SESSION_SECTION_GROUPS, renderSummarySections, parseSummaryBlocks } from '../src/lib/summaryAuthoring.js';
import { CLIENT_SESSION_SUMMARY_FIELDS, CLIENT_SESSION_SUMMARY_LENSES, buildClientSessionSummaryInput, clientAcrossSessionReviewSystemPrompt, clientSessionSummarySystemPrompt, renderClientSessionSummary } from '../api/_lib/ai-client-session-summary.js';
import { buildAcrossSessionComparison } from '../api/_lib/across-session-review.js';
import { ACROSS_SESSION_REVIEW_FIXTURE as fixture } from './fixtures/across-session-review.js';
const sections = Object.fromEntries(CLIENT_SESSION_SUMMARY_FIELDS.map(field => [field, `Content for ${field}.`]));

test('across-session render has five distinct questions, preserves every field once and parses as headings', () => {
  const body = renderClientSessionSummary(sections, 'integrative', 'across_session_review');
  assert.deepEqual(parseSummaryBlocks(body).filter(b => b.type === 'heading').map(b => b.content), ACROSS_SESSION_SECTION_GROUPS.map(g => g.heading));
  for (const text of Object.values(sections)) assert.equal(body.split(text).length - 1, 1);
  assert.doesNotMatch(body, /What we worked on|Making sense of the work|What you noticed and what helped/);
  assert.equal(renderClientSessionSummary(sections), renderSummarySections(sections));
});

test('comparison chronology uses unique encounter IDs and dates, never review dates', () => {
  const frame = buildAcrossSessionComparison([...fixture.captures, fixture.captures[0], { sessionId: 'unknown-date', reviewedAt: '2099-01-01' }]);
  assert.equal(frame.sessions.length, 4);
  assert.equal(frame.sessions.find(s => s.sessionId === 'unknown-date').occurredAt, null);
  assert.deepEqual(frame.sessions.filter(s => s.occurredAt).map(s => s.occurredAt), ['2026-10-08', '2026-10-15', '2026-10-22']);
});

const inputs = CLIENT_SESSION_SUMMARY_LENSES.map(lens => JSON.parse(buildClientSessionSummaryInput({ ...fixture, lens })));
test('every lens compares exactly the same selected sessions, dates and clinical evidence', () => {
  for (const input of inputs) {
    assert.deepEqual(input.evidenceMap, inputs[0].evidenceMap);
    assert.deepEqual(input.comparisonFrame, inputs[0].comparisonFrame);
    assert.equal(input.documentKind, 'across_session_review');
  }
  const current = JSON.parse(buildClientSessionSummaryInput({ ...fixture, window: 'current' }));
  assert.equal(current.documentKind, 'session_summary');
  assert.equal(current.comparisonFrame, undefined);
});

for (const lens of CLIENT_SESSION_SUMMARY_LENSES) test(`${lens} uses the longitudinal contract without imposing the session template`, () => {
  const prompt = clientAcrossSessionReviewSystemPrompt(lens, fixture.summaryOptions);
  assert.match(prompt, /two independent session IDs/);
  assert.match(prompt, /earlier and later session evidence/);
  assert.match(prompt, /single-session retrospective report remains attributed current_observation/);
  assert.match(prompt, /For joint work, consider each participant/);
  assert.match(prompt, /Do not invent homework/);
  assert.match(prompt, /not a recap of the latest appointment/);
  assert.doesNotMatch(prompt, /whatWeWorkedOn:.*encounter/);
  assert.doesNotMatch(clientSessionSummarySystemPrompt(lens), /ACROSS-SESSION REVIEW — DISTINCT DOCUMENT PURPOSE/);
});

test('lens-specific comparison tasks differ in formulation rather than underlying evidence', () => {
  assert.match(clientAcrossSessionReviewSystemPrompt('internal_family_systems'), /relationship to supported inner positions over time/);
  assert.match(clientAcrossSessionReviewSystemPrompt('transactional_analysis'), /what help or response was invited/);
  assert.match(clientAcrossSessionReviewSystemPrompt('gentle_cbt'), /actually reported effects of an agreed experiment/);
  assert.match(clientAcrossSessionReviewSystemPrompt('integrative'), /unfinished relational question/);
  assert.match(clientAcrossSessionReviewSystemPrompt('clinical'), /formal, provisional clinical formulation/);
});

test('both production routes select scope-specific prompts and rendering', () => {
  for (const path of ['api/ai/session-summary.js', 'api/ai/client-session-summary.js']) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.match(source, /window === 'current' \? clientSessionSummarySystemPrompt\(lens,summaryOptions\) : clientAcrossSessionReviewSystemPrompt\(lens,summaryOptions\)/);
    assert.match(source, /renderClientSessionSummary\(structured.sections, lens, window === 'current' \? 'session_summary' : 'across_session_review'\)/);
  }
});

test('Clinical replaces General as a selectable lens and uses formal formulation boundaries', () => {
  assert.ok(CLIENT_SESSION_SUMMARY_LENSES.includes('clinical'));
  assert.ok(!CLIENT_SESSION_SUMMARY_LENSES.includes('general'));
  const clinical = clientAcrossSessionReviewSystemPrompt('clinical', fixture.summaryOptions);
  for (const word of ['predisposing', 'precipitating', 'perpetuating', 'protective', 'unassessed', 'Formulation is not diagnosis']) assert.ok(clinical.includes(word));
  assert.equal(clientSessionSummarySystemPrompt('general'), clientSessionSummarySystemPrompt('integrative'));
});

test('each lens has distinct headings and retains every storage field exactly once for both scopes', () => {
  for (const kind of ['session_summary', 'across_session_review']) {
    const layouts = new Set();
    for (const lens of CLIENT_SESSION_SUMMARY_LENSES) {
      const body = renderClientSessionSummary(sections, lens, kind);
      const headings = parseSummaryBlocks(body).filter(b => b.type === 'heading').map(b => b.content);
      layouts.add(headings.join('|'));
      for (const text of Object.values(sections)) assert.equal(body.split(text).length - 1, 1);
      for (const heading of headings) assert.ok(clientSessionSummarySystemPrompt(lens).includes(heading) || clientAcrossSessionReviewSystemPrompt(lens).includes(heading));
    }
    assert.equal(layouts.size, CLIENT_SESSION_SUMMARY_LENSES.length);
  }
});
