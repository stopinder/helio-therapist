import { isDocumentDiscoveryQuery, parseDocumentSearch } from './ask-helios-documents.js';

// Reconstruct bounded task context from the authenticated, persisted transcript.
// Browser-provided context is never an authority for searches or record selection.
const OTHER_TASK = /\b(?:appointments?|calendar|schedule|reminders?|remind\s+me|tasks?|clients?|session\s+preparation|unfinished\s+sessions?|cpd|reflect(?:ions?)?|published\s+research|studies|papers)\b|\b(?:what\s+(?:else\s+)?needs?\s+(?:my|our)\s+attention|what\s+do\s+i\s+need\s+to\s+do)\b/i;
const DOCUMENT_TASK = /\b(?:documents?|files?|paperwork|forms?|templates?|consent|assessments?|letters?|agreements?|records?)\b/i;
const OPEN_TARGET = /^(?:please\s+)?(?:open|take\s+me\s+to|show\s+me)\s+(?:(?:the|that)\s+)?(?:(most\s+recent|latest|newest|first|second|third|last)\s+)?(?:one|document|file|result)(?:\s+(?:from\s+(?:that|the)\s+list))?[.!?]?$/i;
const REFINE = /\b(?:only|just|filter|narrow|more|next\s+page|previous\s+page|go\s+back|which\s+of\s+these)\b/i;

export async function loadOwnedWorkspaceContext(db, userId, conversationId) {
  // Verified conversation ownership must be established by the caller first.
  // Revalidate the owner on the message query as defence in depth.
  const { data, error } = await db.from('ask_helios_messages')
    .select('role,content').eq('conversation_id', conversationId)
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(36);
  if (error) {
    const failure = new Error('Unable to reload conversation context');
    failure.status = 503;
    throw failure;
  }
  return deriveWorkspaceContext((data || []).reverse());
}

export function isDocumentRecordFollowUp(query) {
  return OPEN_TARGET.test(String(query || '').trim());
}

export function isAmbiguousDocumentFollowUp(query) {
  return /\b(?:open\s+(?:it|that)|show\s+(?:it|that)|which\s+one|which\s+of\s+these)\b/i.test(String(query || '').trim());
}

export function deriveWorkspaceContext(messages = []) {
  let context = null;
  for (const item of messages.slice(-36)) {
    if (item?.role !== 'user' || typeof item.content !== 'string') continue;
    const query = item.content.trim();
    if (!query) continue;
    // Switching to an unrelated task intentionally clears document scope.
    if (OTHER_TASK.test(query) && !DOCUMENT_TASK.test(query)) {
      context = null;
      continue;
    }
    if (isDocumentDiscoveryQuery(query, context) && !isDocumentRecordFollowUp(query)) {
      context = parseDocumentSearch(query, context);
    }
  }
  return context;
}

export function resolveDocumentSelection(query, docs) {
  if (!isDocumentRecordFollowUp(query)) return null;
  const items = Array.isArray(docs) ? docs : [];
  if (!items.length) return { error: 'No matching documents are available to open. Try another search.' };
  const match = String(query).toLowerCase().match(/\b(most\s+recent|latest|newest|first|second|third|last)\b/);
  const term = match?.[1] || null;
  if (!term && items.length !== 1) {
    return { error: 'Which document should I open? Say “open the first one”, or select a document link.' };
  }
  const index = term === 'second' ? 1 : term === 'third' ? 2 : term === 'last' ? items.length - 1 : 0;
  if (index >= items.length) return { error: 'That position is not on the current page. Ask for another page or choose a listed document.' };
  const doc = items[index];
  return { reference: { title: doc.title, url: doc.url, citation: doc.status + ' · ' + doc.type } };
}

export function needsDocumentClarification(query, context) {
  if (!context) return false;
  return isAmbiguousDocumentFollowUp(query) && !isDocumentRecordFollowUp(query);
}

export function isContextualDocumentRequest(query, context) {
  if (!context) return false;
  return isDocumentDiscoveryQuery(query, context) || isDocumentRecordFollowUp(query) || isAmbiguousDocumentFollowUp(query);
}
