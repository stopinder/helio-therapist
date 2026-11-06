/** Inbox state comes from the saved relationship, not a stale import status. */
const hasId = value => typeof value === 'string' && value.trim().length > 0;
export function hasLinkedEncounter(transcript) {
  return Boolean(hasId(transcript?.clientId) && hasId(transcript?.sessionRef));
}
export function transcriptWorkflowState(transcript) {
  if(transcript?.sourceReview?.state==='separated')return{id:'separated',label:'Separated original',tone:'neutral'};
  if(transcript?.sourceReview?.state==='needs_review')return{id:'source-review',label:'Source needs review',tone:'warning'};
  if (transcript?.completedAt) return { id: 'complete', label: 'Inbox setup complete', tone: 'success' };
  if (hasLinkedEncounter(transcript)) return { id: 'assigned', label: 'Assigned', tone: 'success' };
  if (hasId(transcript?.clientId)) return { id: 'needs-encounter', label: 'Assigned - encounter needed', tone: 'warning' };
  if (transcript?.sessionRef) return { id: 'inconsistent', label: 'Assignment needs review', tone: 'warning' };
  if (transcript?.attentionClearedAt) return { id: 'archived', label: 'Archived', tone: 'neutral' };
  return { id: 'needs-client', label: 'Needs client', tone: 'warning' };
}
export function transcriptNeedsAttention(transcript) {
  return Boolean(transcript && transcript.sourceReview?.state!=='separated' && (transcript.sourceReview?.state==='needs_review' || (!hasLinkedEncounter(transcript) && !transcript.completedAt && !transcript.attentionClearedAt)));
}
export function assignedTranscriptIdentity(transcript, clientLabel) {
  return hasId(transcript?.clientId) ? (clientLabel || 'Assigned client') : null;
}
/** Never use the requested client or a newest-session lookup as a navigation fallback. */
export function isConfirmedAssignment(transcript, transcriptId, clientId) {
  return Boolean(transcript && transcript.id === transcriptId && transcript.clientId === clientId && hasLinkedEncounter(transcript));
}
export function sessionSummaryDestination(transcript) {
  if (!hasLinkedEncounter(transcript) || ['needs_review','separated'].includes(transcript?.sourceReview?.state)) return null;
  return {
    name: 'SessionWorkspace',
    params: { clientId: transcript.clientId, sessionId: transcript.sessionRef },
    query: { view: 'summary', from: 'transcript-inbox' }
  };
}
/** Navigation metadata only: never persist source text, summaries, or client objects. */
export function normaliseInboxReturnState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const finite = (number, fallback, max) => typeof number === 'number' && Number.isFinite(number)
    ? Math.min(max, Math.max(0, number)) : fallback;
  return {
    filter: value.filter === 'history' ? 'history' : 'attention',
    search: typeof value.search === 'string' ? value.search.slice(0, 500) : '',
    historyLimit: Math.max(20, Math.floor(finite(value.historyLimit, 20, 10000))),
    scrollTop: finite(value.scrollTop, 0, 10000000),
    windowY: finite(value.windowY, 0, 10000000)
  };
}
