export const resourceKinds = [
  ['worksheet', 'Worksheet'], ['thought_record', 'Thought record'], ['behavioural_experiment', 'Behavioural experiment'],
  ['sleep_diary', 'Sleep diary'], ['psychoeducation', 'Psychoeducation'], ['diagnostic_tool', 'Diagnostic tool'],
  ['outcome_measure', 'Outcome measure'], ['therapist_resource', 'Therapist resource'], ['document', 'Document']
]

export function assignmentStatusLabel(status) {
  return ({ sent: 'Sent', opened: 'Opened', in_progress: 'In progress', completed: 'Completed', awaiting_review: 'Awaiting review', reviewed: 'Reviewed', cancelled: 'Cancelled' })[status] || 'Sent'
}

export function completionModeLabel(mode) {
  return ({ structured: 'Complete in Helio', upload: 'Upload completed copy', either: 'Complete or upload', read_only: 'Read only' })[mode] || 'Complete in Helio'
}
