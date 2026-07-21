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

export function timelineEventPresentation(type) {
  return ({
    resource_sent: { icon: '↗', detail: 'Sent to client' },
    resource_completed: { icon: '✓', detail: 'Completed · Review required' },
    resource_returned: { icon: '↩', detail: 'Returned · Review required' },
    resource_reviewed: { icon: '✓', detail: 'Reviewed' },
    resource_discussed: { icon: '◷', detail: 'Discussed during session' }
  })[type] || { icon: '•', detail: 'Clinical event' }
}

export function assignmentCompletionUrl(token, origin = window.location.origin) {
  return `${origin}/complete?token=${encodeURIComponent(token)}`
}
