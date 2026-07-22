export const resourceKinds = [
  ['worksheet', 'Worksheet'], ['thought_record', 'Thought record'], ['behavioural_experiment', 'Behavioural experiment'],
  ['sleep_diary', 'Sleep diary'], ['psychoeducation', 'Psychoeducation'], ['diagnostic_tool', 'Diagnostic tool'],
  ['outcome_measure', 'Outcome measure'], ['therapist_resource', 'Therapist resource'], ['document', 'Document']
]

export function assignmentStatusLabel(status) {
  return ({ sent: 'Sent', opened: 'Opened', in_progress: 'In progress', completed: 'Completed', awaiting_review: 'Awaiting review', reviewed: 'Reviewed', cancelled: 'Cancelled' })[status] || 'Sent'
}

export function completionModeLabel(mode) {
  return ({ complete_in_helio: 'Complete in Helio', upload: 'Upload completed copy', complete_or_upload: 'Complete or upload', read_only: 'Read only' })[mode] || 'Complete in Helio'
}

export function timelineEventPresentation(type) {
  return ({
    outcome_measure_recorded: { icon: '✓', detail: 'Outcome measure' },
    risk_assessment_recorded: { icon: '!', detail: 'Risk assessment' },
    diagnosis_updated: { icon: '•', detail: 'Diagnosis updated' },
    treatment_plan_updated: { icon: '•', detail: 'Treatment plan updated' },
    goal_updated: { icon: '•', detail: 'Goal updated' },
    referral_recorded: { icon: '↗', detail: 'Referral' },
    medication_changed: { icon: '•', detail: 'Medication change' },
    client_life_event: { icon: '•', detail: 'Client-reported event' },
    clinical_milestone: { icon: '•', detail: 'Clinical milestone' }
  })[type] || { icon: '•', detail: 'Clinical event' }
}

export function assignmentCompletionUrl(token, origin = window.location.origin) {
  return `${origin}/complete?token=${encodeURIComponent(token)}`
}
