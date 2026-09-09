import { isPlainObject } from './scoring.js'

export const CONTINUITY_CONTRACT_VERSION = 'practice-reflection-continuity-v1'

export const CONTINUITY_PROHIBITIONS = Object.freeze([
  'Do not infer therapeutic competence, fitness to practise or clinical suitability.',
  'Do not infer diagnosis, personality, attachment style, trauma history or pathology.',
  'Do not treat changes between snapshots as measured improvement or deterioration.',
  'Do not infer client outcomes or what clients actually experienced.',
  'Do not recommend or rank modalities from these snapshots.',
  'Do not treat generated or authored report prose as independent therapist observation.'
])

export function isPracticeReflectionRecord(reflection) {
  return reflection?.workspace_content?.captureSource === 'practice_reflection' &&
    isPlainObject(reflection.workspace_content.practiceReflection)
}

export function continuityEligibility(reflection) {
  if (!isPracticeReflectionRecord(reflection)) return { eligible: false, reasons: ['not_practice_reflection'] }
  const snapshot = reflection.workspace_content.practiceReflection
  const reasons = []
  if (snapshot.exerciseId !== 'therapeutic-stance') reasons.push('unsupported_exercise')
  if (!snapshot.completedAt || !snapshot.questionVersion || !snapshot.scoringVersion || !snapshot.interpretationVersion) reasons.push('missing_versioned_source')
  if (!isPlainObject(snapshot.responses) || !isPlainObject(snapshot.interpretation)) reasons.push('missing_source_evidence')
  if (snapshot.continuity?.requiresExplicitSelection !== true) reasons.push('explicit_selection_not_recorded')
  if (reflection.client_id || reflection.session_ref) reasons.push('unexpected_clinical_linkage')
  return { eligible: reasons.length === 0, reasons }
}

/**
 * Build a future-engine input that keeps evidence layers separate.
 * This function performs no AI call and makes no longitudinal claim.
 */
export function buildContinuitySourcePacket(reflection) {
  const eligibility = continuityEligibility(reflection)
  if (!eligibility.eligible) throw new Error(`Practice reflection is not eligible for continuity use: ${eligibility.reasons.join(', ')}`)
  const snapshot = reflection.workspace_content.practiceReflection
  return {
    contractVersion: CONTINUITY_CONTRACT_VERSION,
    sourceType: 'therapist_selected_practice_reflection',
    reflectionId: snapshot.id,
    completedAt: snapshot.completedAt,
    versions: {
      question: snapshot.questionVersion,
      scoring: snapshot.scoringVersion,
      interpretation: snapshot.interpretationVersion
    },
    therapistSelections: { ...snapshot.responses },
    deterministicInterpretation: snapshot.interpretation,
    therapistAmendments: Array.isArray(snapshot.therapistAmendments) ? [...snapshot.therapistAmendments] : [],
    narrativeContext: {
      role: 'derived_context_not_independent_evidence',
      mode: snapshot.narrative?.mode || null,
      report: snapshot.narrative?.report || null
    },
    comparisonRules: {
      requireExplicitSelection: true,
      compareDirectionalPatternsOnlyWhenVersionsAreCompatible: true,
      describeChangeAsDifferenceAcrossDatedResponsesNotProgress: true,
      preserveCounterEvidenceAndMixedResponses: true
    },
    prohibitions: [...CONTINUITY_PROHIBITIONS]
  }
}
