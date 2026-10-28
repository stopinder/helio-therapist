// Shared preparation contract. This release deliberately contains only summaries
// and recent-session reviews; formulations and Care proposals are separate work.
export const DOCUMENT_PURPOSES = Object.freeze([
  { id: 'session_summary', label: 'Session summary' },
  { id: 'recent_review', label: 'Review of recent sessions' }
]);
export const DOCUMENT_PERSPECTIVES = Object.freeze([
  { id: 'general', label: 'General' },
  { id: 'gentle_cbt', label: 'Gentle CBT' },
  { id: 'transactional_analysis', label: 'Transactional Analysis' },
  { id: 'integrative', label: 'Integrative' }
]);
export const MAX_DOCUMENT_SESSIONS = 6;
export const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const DOCUMENT_SECTIONS = Object.freeze({
  session_summary: [
    ['focus', 'Session focus'], ['work', 'What we worked on'],
    ['noticed', 'What was noticed'], ['resources', 'Resources and strengths'],
    ['next', 'Recorded intentions and next steps']
  ],
  recent_review: [
    ['current', 'Where the work stands'], ['continuity', 'Continuing themes'],
    ['changes', 'Changes and stability'], ['exceptions', 'Exceptions and differences'],
    ['perspective', 'Working perspective'], ['unfinished', 'Unfinished work and recorded intentions']
  ]
});
export function preparationError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
export function defaultPreparation(purpose = 'session_summary') {
  return { documentPurpose: purpose, lens: 'integrative',
    audience: purpose === 'recent_review' ? 'therapist' : 'client',
    window: purpose === 'recent_review' ? 'last_three' : 'current',
    anchorSessionId: null, selectedSessionIds: [], includeCare: false,
    therapistGuidance: '', transcriptId: null };
}
export function validatePreparation(body = {}) {
  const purpose = body.documentPurpose || 'session_summary';
  const o = { ...defaultPreparation(purpose), ...body };
  if (!DOCUMENT_PURPOSES.some(p => p.id === purpose) || !DOCUMENT_PERSPECTIVES.some(p => p.id === o.lens) ||
      !['client', 'therapist'].includes(o.audience) || !['current', 'last_three', 'selected'].includes(o.window) ||
      typeof o.includeCare !== 'boolean' || typeof o.therapistGuidance !== 'string' || o.therapistGuidance.length > 6000 ||
      !UUID.test(o.clientId || '') || (o.anchorSessionId !== null && !UUID.test(o.anchorSessionId)) ||
      (o.transcriptId !== null && !UUID.test(o.transcriptId)) ||
      !Array.isArray(o.selectedSessionIds) || o.selectedSessionIds.length > MAX_DOCUMENT_SESSIONS ||
      o.selectedSessionIds.some(id => typeof id !== 'string' || !UUID.test(id)) ||
      new Set(o.selectedSessionIds).size !== o.selectedSessionIds.length) {
    throw preparationError('INVALID_PREPARATION', 'Choose valid document options and sources.');
  }
  if (purpose === 'session_summary' && o.window !== 'current') {
    throw preparationError('INVALID_WINDOW', 'Use Review of recent sessions for more than one session.');
  }
  if (purpose === 'recent_review' && o.window === 'current') {
    throw preparationError('INVALID_WINDOW', 'A recent-session review needs at least two reviewed sessions.');
  }
  return Object.fromEntries(['clientId', ...Object.keys(defaultPreparation(purpose))].map(key => [key, o[key]]));
}
export function selectDocumentSessions(catalogue, options) {
  const rows = [...catalogue].filter(r => r?.sessionId && r.occurredAt && Number.isFinite(Date.parse(r.occurredAt)))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sessionId.localeCompare(a.sessionId));
  const eligible = options.documentPurpose === 'recent_review' ? rows.filter(r => r.reviewedAt) : rows;
  const anchor = options.anchorSessionId ? rows.find(r => r.sessionId === options.anchorSessionId) : eligible[0];
  if (!anchor) throw preparationError('NO_SESSION_SOURCE', 'Choose a session belonging to this client.', 409);
  if (options.documentPurpose === 'session_summary') return [anchor];
  if (!anchor.reviewedAt) throw preparationError('UNREVIEWED_ANCHOR', 'Choose a reviewed Session Capture as the end of this review.', 409);
  let selected;
  if (options.window === 'selected') {
    selected = options.selectedSessionIds.map(id => rows.find(r => r.sessionId === id));
    if (selected.some(r => !r || !r.reviewedAt) || !selected.some(r => r?.sessionId === anchor.sessionId)) {
      throw preparationError('INVALID_SELECTION', 'Select reviewed sessions from this client, including the anchor session.', 409);
    }
    if (selected.some(r => Date.parse(r.occurredAt) > Date.parse(anchor.occurredAt))) {
      throw preparationError('FUTURE_SESSION', 'A historical review cannot include sessions after its anchor.', 409);
    }
  } else selected = eligible.filter(r => Date.parse(r.occurredAt) <= Date.parse(anchor.occurredAt)).slice(0, 3);
  if (selected.length < 2) throw preparationError('INSUFFICIENT_REVIEWED_SESSIONS', 'At least two reviewed Session Captures are needed. Use Session summary for one encounter.', 409);
  return selected.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sessionId.localeCompare(a.sessionId));
}
export function documentOutputType(result) {
  return result?.documentPurpose === 'session_summary' && result?.audience === 'client' ? 'session_summary' : 'clinical_summary';
}
export function documentPurposeLabel(id) {
  return DOCUMENT_PURPOSES.find(p => p.id === id)?.label || 'Session summary';
}
