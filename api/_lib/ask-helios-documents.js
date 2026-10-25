// Bounded document discovery. No document body or client data sent to an LLM.
// All searches use the signed-in user's Supabase RLS client and explicit owner.
export const DOCUMENT_PAGE_SIZE = 8;
const SEARCH_TYPES = ['consent', 'assessment', 'intake', 'agreement', 'letter', 'invoice', 'report', 'summary', 'form'];
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const validUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function isDocumentDiscoveryQuery(query, prior = null) {
  const t = clean(query).toLowerCase();
  if (/\b(documents?|files?|paperwork|forms?|templates?|letters?|agreements?|consent|assessment|intake|report|summary)\b/.test(t)) return true;
  return !!prior && /\b(?:only\s+(?:the\s+)?(?:drafts?|completed|finali[sz]ed|reviews?)|next\s+page|more\s+(?:results?|documents?)|show\s+more|previous\s+page|go\s+back|what\s+about\s+(?:the\s+)?(?:drafts?|consent|intake)|which\s+of\s+these)\b/.test(t);
}

export function parseDocumentSearch(query, prior = null) {
  const text = clean(query).toLowerCase();
  const previous = prior && typeof prior === 'object' && prior.kind === 'documents' ? prior : null;
  // Never trust client-provided query fragments as database filter syntax.
  const type = SEARCH_TYPES.find(t => new RegExp('\\b' + t + '(?:s| forms?| documents?)?\\b').test(text));
  const hasType = !!type;
  const reset = /\b(?:all|every|clear|reset)\s+(?:my\s+)?(?:documents?|files?|results?|filters?)\b/.test(text);
  const status = /\b(?:drafts?|unfinished)\b/.test(text) ? 'draft'
    : /\b(?:reviews?|pending)\b/.test(text) ? 'review'
      : /\b(?:finali[sz]ed|completed|finished)\b/.test(text) ? 'final'
        : reset ? null : previous?.status || null;
  const kind = reset ? null : hasType ? type
    : /\b(?:documents?|files?)\b/.test(text) && !/\b(?:only|more|next|previous|these)\b/.test(text)
      ? null : previous?.type || null;
  let page = 0;
  if (previous && !reset && !hasType && !/\b(?:drafts?|reviews?|completed|finali[sz]ed|unfinished|pending)\b/.test(text)) {
    if (/\b(?:next\s+page|more\s+(?:results?|documents?)|show\s+more)\b/.test(text)) page = previous.page + 1;
    else if (/\b(?:previous\s+page|go\s+back)\b/.test(text)) page = Math.max(0, previous.page - 1);
    else if (/\b(?:only\s+these|these\s+documents)\b/.test(text)) page = previous.page;
  }
  return { kind: 'documents', type: kind, status, page: Math.min(50, Math.max(0, page)) };
}

export async function listWorkspaceDocuments({ supabase, userId, search }) {
  if (!validUUID(userId)) throw new Error('Owner identifier is invalid');
  const requested = search && search.kind === 'documents' ? search : parseDocumentSearch('');
  const page = Number.isInteger(requested.page) ? Math.min(50, Math.max(0, requested.page)) : 0;
  const type = SEARCH_TYPES.includes(requested.type) ? requested.type : null;
  const status = ['draft', 'review', 'final'].includes(requested.status) ? requested.status : null;
  // Search title, document type and source filename; filter types on known,
  // escaped literal keywords rather than accepting client PostgREST syntax.
  let q = supabase.from('documents')
    .select('id,title,document_type,status,updated_at,storage_path,original_filename,scope', { count: 'exact' })
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false });
  if (status === 'final') q = q.in('status', ['final', 'finalized', 'completed']);
  else if (status) q = q.eq('status', status);
  if (type) {
    // Known bounded terms only. URL-safe strings originate from whitelist above.
    q = q.or('title.ilike.%' + type + '%,document_type.ilike.%' + type + '%,original_filename.ilike.%' + type + '%');
  }
  const start = page * DOCUMENT_PAGE_SIZE;
  const { data, count, error } = await q.range(start, start + DOCUMENT_PAGE_SIZE - 1);
  if (error) {
    const failure = new Error('Document search unavailable');
    failure.status = 503;
    throw failure;
  }
  const total = Math.max(0, Number(count) || 0);
  const list = (data || []).map(doc => ({
    id: doc.id, title: clean(doc.title) || 'Untitled document',
    type: clean(doc.document_type) || 'other', status: clean(doc.status) || 'unknown',
    updatedAt: doc.updated_at || null,
    url: '/documents?open=' + encodeURIComponent(doc.id)
  }));
  const visible = list.length;
  const from = visible ? start + 1 : 0, to = start + visible;
  const header = 'Documents' +
    (type ? ' matching "' + type + '"' : '') +
    (status ? ' (' + status + ')' : '');
  const lines = [header, 'Showing ' + from + '–' + to + ' of ' + total + ' matching documents.'];
  for (const doc of list) {
    const date = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'Unknown date';
    lines.push('• ' + doc.title + ' — ' + doc.type + ', ' + doc.status + ', updated ' + date);
  }
  if (!list.length) lines.push('No matching documents on this page.');
  if (to < total) lines.push('Ask “show more documents” to view the next page.');
  if (total && !type && !status) lines.push('To narrow results, ask “show only consent forms” or “show only drafts”.');
  const answer = lines.join('\n') + '\n\nResults are drawn from your authorised Helios documents. Nothing was changed.';
  return {
    answer,
    references: list.map(doc => ({ title: doc.title, url: doc.url, citation: doc.status + ' · ' + doc.type })),
    documentSearch: { kind: 'documents', type, status, page, total, shown: to, hasMore: to < total },
    proposedAction: null
  };
}
