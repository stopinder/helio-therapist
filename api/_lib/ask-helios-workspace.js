// Read-only workspace retrieval. No service-role database client and no OpenAI
// call receives client or practice records.
import { isDocumentDiscoveryQuery, isDocumentPaginationRequest, parseDocumentSearch, listWorkspaceDocuments } from './ask-helios-documents.js';
import { isContextualDocumentRequest, isDocumentRecordFollowUp, isAmbiguousDocumentFollowUp, needsDocumentClarification, resolveDocumentSelection } from './ask-helios-context.js';
const LIMIT = 8;
const safe = (value, max = 220) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const source = (title, url) => ({ title: safe(title, 110), url, citation: 'Open in Helios' });

export function classifyWorkspaceRequest(query, clientId) {
  const text = String(query || '').toLowerCase();
  if (/\b(remind me to|create (a )?reminder to|add (a )?reminder to)\b/.test(text)) return 'propose_reminder';
  if (clientId && /\b(prepare|preparation|brief|next session|last session)\b/.test(text)) return 'client_brief';
  if (/\b(appointments?|calendar|schedule|bookings?|who am i seeing|tomorrow|today)\b/.test(text)) return 'appointments';
  if (/\b(unfinished|outstanding|incomplete|sessions?|clinical notes?)\b/.test(text)) return 'sessions';
  if (/\b(documents?|files?|consent form|letters?)\b/.test(text)) return 'documents';
  if (/\b(reminders?|tasks?|to-do)\b/.test(text)) return 'reminders';
  if (/\b(cpd|professional development|learning log|reflection)\b/.test(text)) return 'cpd';
  if (/\b(clients?|people i work with)\b/.test(text)) return 'clients';
  return 'overview';
}

export function parseReminderProposal(query) {
  const body = String(query || '').replace(/^.*?\b(remind me to|create (a )?reminder to|add (a )?reminder to)\s*/i, '').replace(/[.!?]\s*$/, '').trim();
  return body.length >= 3 && body.length <= 300 ? { type: 'create_reminder', body } : null;
}

async function rows(db, table, ownerColumn, userId, columns, modify = q => q) {
  const { data, error } = await modify(db.from(table).select(columns).eq(ownerColumn, userId).limit(LIMIT));
  if (error) {
    const failure = new Error('Workspace records are temporarily unavailable');
    failure.code = 'WORKSPACE_QUERY_FAILED'; failure.status = 503;
    throw failure;
  }
  return Array.isArray(data) ? data : [];
}

function when(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC'
    : 'Date not available';
}
async function appointments(db, uid, now) {
  const until = new Date(now.getTime() + 7 * 86400000).toISOString();
  const events = await rows(db, 'appointments', 'user_id', uid, 'id,client_id,starts_at,status',
    q => q.gte('starts_at', now.toISOString()).lte('starts_at', until).order('starts_at'));
  const ids = [...new Set(events.map(e => e.client_id).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    for (const client of await rows(db, 'clients', 'user_id', uid, 'id,display_name', q => q.in('id', ids))) {
      names.set(client.id, safe(client.display_name, 100));
    }
  }
  return {
    heading: 'Helios appointments (next 7 days; UTC). Connected external calendar events may not be included.',
    lines: events.map(e => when(e.starts_at) + ' — ' + (names.get(e.client_id) || 'Appointment') + ' (' + safe(e.status, 30) + ')'),
    references: [source('Calendar', '/calendar'), ...events.filter(e => names.has(e.client_id))
      .map(e => source(names.get(e.client_id), '/clients/' + e.client_id))]
  };
}
async function sessions(db, uid) {
  const items = await rows(db, 'sessions', 'user_id', uid, 'id,client_id,occurred_at,status,notes_status',
    q => q.neq('status', 'completed').order('occurred_at', { ascending: false }));
  return {
    heading: 'Sessions not marked completed',
    lines: items.map(s => when(s.occurred_at) + ' — session: ' + safe(s.status, 32) + ', notes: ' + (safe(s.notes_status, 32) || 'not set')),
    references: items.filter(s => s.client_id).map(s => source('Open session', '/clients/' + s.client_id + '/sessions/' + s.id))
  };
}
async function documents(db, uid, now, question = '') {
  const draftsOnly = /\b(draft|unfinished|pending|review)\b/i.test(question);
  const typeHint = /\b(consent|agreement|assessment|invoice|letter|report)\b/i.exec(question)?.[0] || null;
  const items = await rows(db, 'documents', 'user_id', uid, 'id,title,status,updated_at', q => {
    if (draftsOnly) q = q.in('status', ['draft', 'review']);
    if (typeHint) q = q.ilike('title', '%' + typeHint + '%');
    return q.order('updated_at', { ascending: false });
  });
  return {
    heading: draftsOnly ? 'Draft and review documents' : 'Recently updated documents' + (typeHint ? ' matching ' + typeHint : ''),
    lines: items.map(d => (safe(d.title, 120) || 'Untitled document') + ' — ' + safe(d.status, 20) + ', updated ' + when(d.updated_at)),
    references: [source('Documents', '/documents')]
  };
}
async function clients(db, uid) {
  const items = await rows(db, 'clients', 'user_id', uid, 'id,display_name',
    q => q.eq('archived', false).order('updated_at', { ascending: false }));
  return {
    heading: 'Recently updated active clients (up to eight)',
    lines: items.map(c => safe(c.display_name, 120)),
    references: items.map(c => source(c.display_name, '/clients/' + c.id))
  };
}
async function reminders(db, uid) {
  const items = await rows(db, 'therapist_reminders', 'therapist_id', uid, 'id,body,created_at',
    q => q.is('completed_at', null).order('created_at', { ascending: false }));
  return {
    heading: 'Open reminders',
    lines: items.map(r => safe(r.body, 220)),
    references: [source('Today', '/overview')]
  };
}
async function cpd(db, uid) {
  const items = await rows(db, 'private_reflections', 'user_id', uid, 'id,theme,created_at',
    q => q.is('client_id', null).order('created_at', { ascending: false }));
  return {
    heading: 'Recent non-client professional reflections',
    lines: items.map(r => when(r.created_at) + ' — ' + (safe(r.theme, 110) || 'Reflection recorded')),
    references: [source('Reflections', '/supervision/reflections')]
  };
}
async function clientBrief(db, uid, clientId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    const error = new Error('Select a client to prepare'); error.status = 400; throw error;
  }
  const { data: client, error } = await db.from('clients').select('id,display_name,current_focus')
    .eq('user_id', uid).eq('id', clientId).maybeSingle();
  if (error || !client) {
    const failure = new Error('Client not found in your workspace'); failure.status = 404; throw failure;
  }
  const recent = await rows(db, 'sessions', 'user_id', uid, 'id,client_id,occurred_at,status,notes_status',
    q => q.eq('client_id', clientId).order('occurred_at', { ascending: false }).limit(5));
  const timeline = await rows(db, 'client_timeline_events', 'user_id', uid, 'id,client_id,occurred_at,summary',
    q => q.eq('client_id', clientId).order('occurred_at', { ascending: false }).limit(4));
  return {
    heading: 'Preparation: ' + safe(client.display_name, 80),
    lines: [
      'Recorded current focus: ' + (safe(client.current_focus, 400) || 'Not recorded'),
      ...recent.map(s => when(s.occurred_at) + ' — session ' + safe(s.status, 30) + ', notes ' + (safe(s.notes_status, 30) || 'not set')),
      ...timeline.map(t => when(t.occurred_at) + ' — recorded timeline: ' + safe(t.summary, 220))
    ],
    references: [source('Open client workspace', '/clients/' + clientId),
      ...recent.map(s => source('Open session', '/clients/' + clientId + '/sessions/' + s.id))],
    note: 'This is retrieved record content, not a diagnosis or formulation. Check the original material before the session.'
  };
}

export async function answerWorkspaceQuestion({ supabase, userId, query, clientId = null, documentSearch = null, now = new Date() }) {
  if (!documentSearch && isDocumentPaginationRequest(query)) {
    const failure = new Error('No saved document search is active. Reopen the original conversation, or start a new search with "Find my documents".');
    failure.status = 409;
    failure.code = 'DOCUMENT_CONTEXT_REQUIRED';
    throw failure;
  }
  // Search follow-ups are contextual. Reuse validated document filters without
  // loading any document body or involving a language model.
  if ((isDocumentRecordFollowUp(query) || isAmbiguousDocumentFollowUp(query)) && !documentSearch) {
    return { answer: 'I need a specific document search first. Try “find my documents”, then choose one of the results.', references: [], proposedAction: null };
  }
  if (needsDocumentClarification(query, documentSearch)) {
    return { answer: 'Which document do you mean? Choose a document link, or say “open the first one”.', references: [], proposedAction: null, documentSearch };
  }
  if (isDocumentRecordFollowUp(query) && documentSearch) {
    const listing = await listWorkspaceDocuments({ supabase, userId, search: documentSearch });
    const choice = resolveDocumentSelection(query, listing.records);
    return { answer: choice?.error || 'Here is the document you selected. Open its link to view the original record.',
      references: choice?.reference ? [choice.reference] : [], proposedAction: null,
      documentSearch: listing.documentSearch };
  }
  if (isDocumentDiscoveryQuery(query, documentSearch)) {
    return listWorkspaceDocuments({ supabase, userId, search: parseDocumentSearch(query, documentSearch) });
  }
  const intent = classifyWorkspaceRequest(query, clientId);
  if (intent === 'propose_reminder') {
    const action = parseReminderProposal(query);
    return {
      answer: action
        ? 'I can add this reminder to Today:\n\n“' + action.body + '”\n\nNothing has been saved. Select Create reminder to approve.'
        : 'What should the reminder say? Try “Remind me to review my session notes”.',
      references: [], proposedAction: action
    };
  }
  const handlers = { appointments, sessions, documents, clients, reminders, cpd };
  const parts = intent === 'overview'
    ? await Promise.all([appointments(supabase, userId, now), reminders(supabase, userId),
      sessions(supabase, userId), documents(supabase, userId, now, 'draft')])
    : intent === 'client_brief'
      ? [await clientBrief(supabase, userId, clientId)]
      : [await handlers[intent](supabase, userId, now, query)];
  return {
    answer: parts.map(p => p.heading + '\n' +
      (p.lines.length ? p.lines.map(line => '• ' + line).join('\n') : 'No matching records found.') +
      (p.note ? '\n\n' + p.note : '')).join('\n\n') +
      '\n\nThese are the records visible to your account. No records were changed.',
    references: parts.flatMap(p => p.references).slice(0, 12),
    proposedAction: null
  };
}
