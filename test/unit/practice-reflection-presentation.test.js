import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { therapistQuestions } from '../../src/quiz/therapist/questions.js'
import { DISCLAIMER, BOUNDARY_NOTE } from '../../src/quiz/therapist/content.js'
import { buildResult, buildFallbackReport } from '../../src/quiz/therapist/buildResult.js'
import { createReflectionSnapshot, validateReflectionSnapshot, reflectionText, SNAPSHOT_VERSION, LEGACY_SNAPSHOT_VERSION } from '../../src/quiz/therapist/snapshot.js'
import { THERAPEUTIC_STANCE_PROMPT_VERSION, therapeuticStanceSystemPrompt, buildTherapeuticStanceInput } from '../../api/_lib/therapeutic-stance-report.js'

const answers = Object.fromEntries(therapistQuestions.map(q => [q.id, 'a']))
const result = buildResult(answers)
const report = buildFallbackReport(result)
const make = (extra = {}) => createReflectionSnapshot({
  id: '33333333-3333-4333-8333-333333333333', completedAt: '2026-09-09T20:00:00.000Z',
  answers, report, mode: 'fallback', ...extra
})
const legacyText = (snapshot, original) => [
  'CPD · Practice reflection — Your therapeutic stance', `Completed: ${snapshot.completedAt}`,
  snapshot.narrative.mode === 'ai' ? 'AI-written narrative from selected hypothetical responses. Not therapist-authored observation.' : 'Question-based reflection — authored wording, not AI-generated or an observation of practice.',
  DISCLAIMER, BOUNDARY_NOTE,
  ...snapshot.narrative.report.sections.flatMap(s => [s.title, ...s.paragraphs]),
  `Question version: ${snapshot.questionVersion}`, `Scoring version: ${snapshot.scoringVersion}`,
  `Interpretation version: ${snapshot.interpretationVersion}`,
  ...(snapshot.narrative.promptVersion ? [`AI prompt version: ${snapshot.narrative.promptVersion}`] : []),
  ...(snapshot.narrative.model ? [`AI model: ${snapshot.narrative.model}`] : []),
  original ? 'A dated reflective snapshot, not a permanent profile or measured competence. Saving does not trigger AI analysis.' : 'A dated reflective snapshot, not a permanent profile or measured competence. Saving does not trigger continuity analysis.'
].join('\n\n')

test('v2 prompt separates section purposes and uses collegial, non-repetitive language', () => {
  assert.equal(THERAPEUTIC_STANCE_PROMPT_VERSION, 'therapeutic-stance-integrative-ifs-v2')
  assert.match(therapeuticStanceSystemPrompt, /Preferences are not demonstrated abilities/)
  assert.match(therapeuticStanceSystemPrompt, /Do not repeat the same observation/)
  assert.match(therapeuticStanceSystemPrompt, /Trust the reader's professional literacy/)
  assert.match(therapeuticStanceSystemPrompt, /- tensions: One or two supported competing priorities/)
  assert.match(therapeuticStanceSystemPrompt, /- limits: Concrete circumstances or cues/)
  assert.match(therapeuticStanceSystemPrompt, /- supervision: Three or four distinct, open questions/)
  assert.match(therapeuticStanceSystemPrompt, /Do not insert disclaimers/)
  assert.match(buildTherapeuticStanceInput(result), /not text to reproduce/)
})

test('IFS remains optional and invitational without assigning parts or protective motives', () => {
  assert.match(therapeuticStanceSystemPrompt, /only as an optional invitation, never as a finding/)
  assert.match(therapeuticStanceSystemPrompt, /at most one short passage/)
  assert.match(therapeuticStanceSystemPrompt, /do not state what it protects against/)
  assert.match(therapeuticStanceSystemPrompt, /Do not write “a part of you wants…/)
  assert.match(therapeuticStanceSystemPrompt, /Omit it when it adds nothing/)
})

test('new text exports carry one closing note, with no opening disclaimer block', () => {
  const value = make(), text = reflectionText(value)
  assert.equal(value.schemaVersion, SNAPSHOT_VERSION)
  assert.equal(text.split(DISCLAIMER).length - 1, 1)
  assert.equal(text.endsWith(DISCLAIMER), true)
  assert.equal(text.includes(BOUNDARY_NOTE), false)
  assert.ok(text.indexOf(DISCLAIMER) > text.indexOf('A possible description of your therapeutic identity'))
  assert.deepEqual(validateReflectionSnapshot(value), value)
  assert.deepEqual(value.interpretation, result)
})

test('AI metadata roundtrips independently of responses and is included in the export', () => {
  const value = make({ mode: 'ai', promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION, model: 'synthetic-test-model' })
  assert.equal(value.narrative.promptVersion, THERAPEUTIC_STANCE_PROMPT_VERSION)
  assert.equal(value.narrative.model, 'synthetic-test-model')
  assert.equal(value.provenance.providerMetadata, 'prompt_version_and_model_recorded_without_provider_payload')
  assert.deepEqual(validateReflectionSnapshot(value), value)
  assert.deepEqual(value.responses, answers)
  assert.match(reflectionText(value), /AI prompt version: therapeutic-stance-integrative-ifs-v2/)
})

test('missing provider metadata is not described as recorded', () => {
  assert.equal(make({ mode: 'ai' }).provenance.providerMetadata, 'not_recorded_by_current_report_endpoint')
  const fallback = make({ promptVersion: 'should-not-be-used', model: 'should-not-be-used' })
  assert.equal(fallback.narrative.promptVersion, null)
  assert.equal(fallback.narrative.model, null)
  assert.equal(fallback.provenance.providerMetadata, 'not_applicable')
})

test('previous production and preview v1 snapshots retain their exact representation', () => {
  for (const label of ['not_recorded_by_current_report_endpoint', 'not_applicable', 'prompt_version_and_model_recorded_without_provider_payload']) {
    const isAI = label === 'prompt_version_and_model_recorded_without_provider_payload'
    const value = make(isAI ? { mode: 'ai', promptVersion: 'therapeutic-stance-integrative-ifs-v1', model: 'synthetic-test-model' } : {})
    value.schemaVersion = LEGACY_SNAPSHOT_VERSION
    value.provenance.providerMetadata = label
    const before = JSON.stringify(value)
    assert.deepEqual(validateReflectionSnapshot(value), value)
    assert.equal(reflectionText(value), legacyText(value, label === 'not_recorded_by_current_report_endpoint'))
    assert.equal(JSON.stringify(value), before, 'Reading must not rewrite old records')
  }
})

test('unknown schema or provenance labels are rejected rather than migrated silently', () => {
  const unknown = make(); unknown.schemaVersion = 'future-unknown'
  assert.throws(() => validateReflectionSnapshot(unknown), /Unsupported reflection version/)
  assert.throws(() => reflectionText(unknown), /Unsupported reflection version/)
  const legacy = make(); legacy.schemaVersion = LEGACY_SNAPSHOT_VERSION; legacy.provenance.providerMetadata = 'invented'
  assert.throws(() => validateReflectionSnapshot(legacy), /Unsupported reflection provenance/)
})

test('Vue keeps the quiet note and direct generation without a permission checkbox', async () => {
  const source = await readFile(new URL('../../src/views/TherapistQuizView.vue', import.meta.url), 'utf8')
  const parsed = parse(source)
  assert.deepEqual(parsed.errors, [])
  assert.deepEqual(compileTemplate({ source: parsed.descriptor.template.content, filename: 'TherapistQuizView.vue', id: 'test-cpd' }).errors, [])
  assert.equal(source.match(/\{\{ DISCLAIMER \}\}/g)?.length, 1)
  assert.doesNotMatch(source, /notice boundary|BOUNDARY_NOTE|acknowledged/)
  assert.match(source, /reflection-footnote small \{ font-size: 13px/)
  assert.doesNotMatch(source, /aiConsent|class="consent"|consent:\s*true/)
  assert.match(source, /:disabled="busy \|\| !progress.complete" @click="requestAIReport"/)
  assert.match(source, /if \(busy.value \|\| !canUseAI.value \|\| !progress.value.complete\) return/)
  assert.equal(source.match(/\brequestAIReport\b/g)?.length, 2, 'Only the button handler and function definition may reference generation')
  assert.match(source, /JSON.stringify\(\{ quizVersion: QUIZ_VERSION, answers: selected \}\)/)
  assert.match(source, /promptVersion: data.promptVersion, model: data.model/)
})

test('report endpoint removes the permission field but retains authentication and deterministic scoring', async () => {
  const source = await readFile(new URL('../../api/therapist-report.js', import.meta.url), 'utf8')
  assert.match(source, /const allowedKeys = new Set\(\['quizVersion', 'answers'\]\)/)
  assert.doesNotMatch(source, /\bconsent\b/)
  assert.match(source, /const \{ user \} = await requireAuthenticatedUser\(req\)/)
  assert.match(source, /const result = buildResult\(body.answers\)/)
  assert.match(source, /validateTherapeuticStanceAIResponse\(completion/)
  assert.ok(source.indexOf('const { user } = await requireAuthenticatedUser(req)') < source.indexOf('const { completion, model } = await runTextAI('))
})
