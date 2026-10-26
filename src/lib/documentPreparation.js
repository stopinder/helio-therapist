// One preparation contract. Care-plan updates are intentionally not implemented here.
export const DOCUMENT_PURPOSES = Object.freeze([
  { id: 'session_summary', label: 'Session summary' },
  { id: 'recent_review', label: 'Review of recent sessions' },
  { id: 'working_formulation', label: 'Working formulation' }
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
  ],
  working_formulation: [
    ['observations', 'Recorded material'],
    ['understanding', 'Provisional understanding'],
    ['alternatives', 'Alternatives and contrary evidence'],
    ['resources', 'Resources and exceptions'],
    ['uncertainties', 'What remains uncertain'],
    ['review', 'Questions to review'],
    ['safety', 'Recorded safety context']
  ]
});
export function preparationError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
export function defaultPreparation(purpose = 'session_summary') {
  return { documentPurpose: purpose, lens: 'integrative',
    audience: purpose === 'session_summary' ? 'client' : 'therapist',
    window: purpose === 'session_summary' ? 'current' : 'last_three',
    anchorSessionId: null, selectedSessionIds: [], includeCare: false,
    therapistGuidance: '', transcriptId: null };
}
export function validatePreparation(body = {}) {
  const purpose = body.documentPurpose || 'session_summary';
  const o = { ...defaultPreparation(purpose), ...body };
  if (!DOCUMENT_PURPOSES.some(p => p.id === purpose) || !DOCUMENT_PERSPECTIVES.some(p => p.id === o.lens) ||
      !['client', 'therapist'].includes(o.audience) || !['current', 'last_three', 'selected'].includes(o.window) ||
      typeof o.includeCare !== 'boolean' || typeof o.therapistGuidance !== 'string' || o.therapistGuidance.length > 6000 ||
      typeof o.clientId !== 'string' || !UUID.test(o.clientId) ||
      (o.anchorSessionId !== null && (typeof o.anchorSessionId !== 'string' || !UUID.test(o.anchorSessionId))) ||
      (o.transcriptId !== null && (typeof o.transcriptId !== 'string' || !UUID.test(o.transcriptId))) ||
      !Array.isArray(o.selectedSessionIds) || o.selectedSessionIds.length > MAX_DOCUMENT_SESSIONS ||
      o.selectedSessionIds.some(id => typeof id !== 'string' || !UUID.test(id)) ||
      new Set(o.selectedSessionIds).size !== o.selectedSessionIds.length) {
    throw preparationError('INVALID_PREPARATION', 'Choose valid document options and sources.');
  }
  if (purpose === 'working_formulation' && o.audience !== 'therapist') {
    throw preparationError('INVALID_PREPARATION', 'Working formulations are therapist documents. Prepare a separate client summary from reviewed sources.');
  }
  if (purpose !== 'session_summary' && o.transcriptId !== null) {
    throw preparationError('INVALID_PREPARATION', 'Reviews and working formulations use reviewed Session Captures, not raw transcripts.');
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
  const needsReviewed = options.documentPurpose !== 'session_summary';
  const eligible = needsReviewed ? rows.filter(r => r.reviewedAt) : rows;
  const anchor = options.anchorSessionId ? rows.find(r => r.sessionId === options.anchorSessionId) : eligible[0];
  if (!anchor) throw preparationError('NO_SESSION_SOURCE', 'Choose a session belonging to this client.', 409);
  if (!needsReviewed) return [anchor];
  if (!anchor.reviewedAt) throw preparationError('UNREVIEWED_ANCHOR', 'Choose a reviewed Session Capture as the end of this document.', 409);
  if (options.documentPurpose === 'working_formulation' && options.window === 'current') return [anchor];
  let selected;
  if (options.window === 'selected') {
    selected = options.selectedSessionIds.map(id => rows.find(r => r.sessionId === id));
    if (selected.some(r => !r || !r.reviewedAt) || !selected.some(r => r?.sessionId === anchor.sessionId)) {
      throw preparationError('INVALID_SELECTION', 'Select reviewed sessions from this client, including the anchor session.', 409);
    }
    if (selected.some(r => Date.parse(r.occurredAt) > Date.parse(anchor.occurredAt))) {
      throw preparationError('FUTURE_SESSION', 'A historical document cannot include sessions after its anchor.', 409);
    }
  } else selected = eligible.filter(r => Date.parse(r.occurredAt) <= Date.parse(anchor.occurredAt)).slice(0, 3);
  const minimum = options.documentPurpose === 'working_formulation' ? 1 : 2;
  if (selected.length < minimum) throw preparationError('INSUFFICIENT_REVIEWED_SESSIONS', 'At least two reviewed Session Captures are needed. Use Session summary for one encounter.', 409);
  return selected.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sessionId.localeCompare(a.sessionId));
}
export function documentOutputType(result) {
  return result?.documentPurpose === 'session_summary' && result?.audience === 'client' ? 'session_summary' : 'clinical_summary';
}
export function documentPurposeLabel(id) {
  return DOCUMENT_PURPOSES.find(p => p.id === id)?.label || 'Session summary';
}
// Only source-selection metadata crosses this boundary, never formulation text,
// claims, risk, therapist additions, accepted Care hypotheses or draft history.
export function clientSummaryPreparation(generation) {
  const ids = generation?.selectedSessionIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_DOCUMENT_SESSIONS ||
      ids.some(id => typeof id !== 'string' || !UUID.test(id)) || new Set(ids).size !== ids.length ||
      !ids.includes(generation.anchorSessionId)) {
    throw preparationError('INVALID_PREPARATION', 'Review the source sessions before preparing a separate client summary.');
  }
  const purpose = ids.length > 1 ? 'recent_review' : 'session_summary';
  return { ...defaultPreparation(purpose), audience: 'client',
    lens: DOCUMENT_PERSPECTIVES.some(l => l.id === generation.lens) ? generation.lens : 'general',
    window: ids.length > 1 ? 'selected' : 'current',
    anchorSessionId: generation.anchorSessionId, selectedSessionIds: [...ids] };
}
