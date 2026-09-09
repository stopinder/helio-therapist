import { QUIZ_VERSION } from './questions.js'
import { REPORT_VERSION, DISCLAIMER, BOUNDARY_NOTE, reportSections } from './content.js'
import { buildResult } from './buildResult.js'
import { isPlainObject, validateAnswers } from './scoring.js'

export const SNAPSHOT_VERSION = 'cpd-stance-snapshot-v2'
export const LEGACY_SNAPSHOT_VERSION = 'cpd-stance-snapshot-v1'
export const SCORING_VERSION = 'therapist-dimensions-v1-draft1'
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function canonicalJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']'
  if (isPlainObject(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}'
  return JSON.stringify(value)
}

export function validReportShape(report) {
  return isPlainObject(report) && Array.isArray(report.sections) && report.sections.length === reportSections.length &&
    report.sections.every((section, index) => section?.id === reportSections[index].id &&
      section.title === reportSections[index].title && Array.isArray(section.paragraphs) &&
      section.paragraphs.length > 0 && section.paragraphs.length <= 6 &&
      section.paragraphs.every(p => typeof p === 'string' && p.trim().length > 0 && p.length <= 3500))
}

const cleanMeta = value => typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null
const LEGACY_METADATA_LABELS = new Set([
  'not_recorded_by_current_report_endpoint',
  'prompt_version_and_model_recorded_without_provider_payload',
  'not_applicable'
])

/** Capture once per report, not once per save retry. No identity or client data. */
export function createReflectionSnapshot({ id, completedAt, answers, report, mode, promptVersion = null, model = null }) {
  if (!UUID_PATTERN.test(id || '')) throw new Error('A valid reflection identifier is required.')
  if (typeof completedAt !== 'string' || !Number.isFinite(Date.parse(completedAt)) || new Date(completedAt).toISOString() !== completedAt) throw new Error('A valid completion date is required.')
  validateAnswers(answers)
  if (!['fallback', 'ai'].includes(mode) || !validReportShape(report)) throw new Error('The reflection is not ready to save.')
  const cleanReport = { sections: report.sections.map(s => ({ id: s.id, title: s.title, paragraphs: [...s.paragraphs] })) }
  const cleanPromptVersion = mode === 'ai' ? cleanMeta(promptVersion) : null
  const cleanModel = mode === 'ai' ? cleanMeta(model) : null
  return {
    schemaVersion: SNAPSHOT_VERSION,
    id,
    exerciseId: 'therapeutic-stance',
    completedAt,
    questionVersion: QUIZ_VERSION,
    scoringVersion: SCORING_VERSION,
    interpretationVersion: REPORT_VERSION,
    responses: { ...answers },
    interpretation: buildResult(answers),
    narrative: { mode, report: cleanReport, promptVersion: cleanPromptVersion, model: cleanModel },
    provenance: {
      source: 'self_selected_hypothetical_scenarios',
      interpretation: 'deterministic_unvalidated_editorial_rules',
      narrative: mode === 'ai' ? 'ai_written_not_therapist_authored' : 'authored_question_based_wording',
      timestampSource: 'browser_report_completion',
      providerMetadata: mode !== 'ai' ? 'not_applicable' : cleanPromptVersion && cleanModel
        ? 'prompt_version_and_model_recorded_without_provider_payload'
        : 'not_recorded_by_current_report_endpoint'
    },
    continuity: { status: 'not_analysed', requiresExplicitSelection: true, comparableOnlyWithCompatibleVersions: true },
    therapistAmendments: []
  }
}

/** Rebuild before persistence. Preserve v1 representations for historical save confirmation. */
export function validateReflectionSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) throw new Error('No reflection to save.')
  if (![SNAPSHOT_VERSION, LEGACY_SNAPSHOT_VERSION].includes(snapshot.schemaVersion)) throw new Error('Unsupported reflection version.')
  const rebuilt = createReflectionSnapshot({ id: snapshot.id, completedAt: snapshot.completedAt,
    answers: snapshot.responses, report: snapshot.narrative?.report, mode: snapshot.narrative?.mode,
    promptVersion: snapshot.narrative?.promptVersion, model: snapshot.narrative?.model })
  if (snapshot.schemaVersion === LEGACY_SNAPSHOT_VERSION) {
    const label = snapshot.provenance?.providerMetadata
    if (!LEGACY_METADATA_LABELS.has(label)) throw new Error('Unsupported reflection provenance.')
    rebuilt.schemaVersion = LEGACY_SNAPSHOT_VERSION
    rebuilt.provenance.providerMetadata = label
  }
  if (canonicalJSON(snapshot) !== canonicalJSON(rebuilt)) throw new Error('This reflection has changed or uses an unsupported version. Please generate it again.')
  return rebuilt
}

export function reflectionText(snapshot) {
  const narrative = snapshot.narrative
  const sections = narrative.report.sections.flatMap(section => [section.title, ...section.paragraphs])
  const versions = [
    `Question version: ${snapshot.questionVersion}`,
    `Scoring version: ${snapshot.scoringVersion}`,
    `Interpretation version: ${snapshot.interpretationVersion}`,
    ...(narrative.promptVersion ? [`AI prompt version: ${narrative.promptVersion}`] : []),
    ...(narrative.model ? [`AI model: ${narrative.model}`] : [])
  ]
  const heading = ['CPD · Practice reflection — Your therapeutic stance', `Completed: ${snapshot.completedAt}`]
  if (snapshot.schemaVersion === LEGACY_SNAPSHOT_VERSION) {
    // Do not silently reformat previously saved text or break same-ID save retries.
    const originalEndpoint = snapshot.provenance.providerMetadata === 'not_recorded_by_current_report_endpoint'
    return [
      ...heading,
      narrative.mode === 'ai' ? 'AI-written narrative from selected hypothetical responses. Not therapist-authored observation.' : 'Question-based reflection — authored wording, not AI-generated or an observation of practice.',
      DISCLAIMER, BOUNDARY_NOTE, ...sections, ...versions,
      originalEndpoint
        ? 'A dated reflective snapshot, not a permanent profile or measured competence. Saving does not trigger AI analysis.'
        : 'A dated reflective snapshot, not a permanent profile or measured competence. Saving does not trigger continuity analysis.'
    ].join('\n\n')
  }
  if (snapshot.schemaVersion !== SNAPSHOT_VERSION) throw new Error('Unsupported reflection version.')
  return [
    ...heading,
    narrative.mode === 'ai' ? 'AI-written integrative reflection.' : 'Question-based reflection — authored wording, not AI-generated.',
    ...sections, ...versions,
    DISCLAIMER
  ].join('\n\n')
}
