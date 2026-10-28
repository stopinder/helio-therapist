import { createHash } from 'node:crypto';
import { preparationError, selectDocumentSessions } from '../../src/lib/documentPreparation.js';

const CAPTURE_FIELDS = ['presentingConcerns', 'sessionThemes', 'interventionsUsed', 'clientResponse', 'progressGoals', 'planNextSession'];
const CARE_KINDS = ['current_focus', 'shared_understanding', 'trying', 'change_noticed', 'learning', 'themes', 'interventions', 'outcomes'];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failRead = error => { if (error) throw preparationError('SOURCE_UNAVAILABLE', 'The selected source material could not be loaded. Nothing was generated.', 503); };
export function captureForAudience(content, audience) {
  const keys = audience === 'therapist' ? [...CAPTURE_FIELDS, 'riskSafeguarding'] : CAPTURE_FIELDS;
  return Object.fromEntries(keys.filter(key => typeof content?.[key] === 'string' && content[key].trim()).map(key => [key, content[key].trim()]));
}
export async function loadDocumentCatalogue(db, userId, clientId, anchorSessionId = null) {
  const { data: client, error } = await db.from('clients').select('id').eq('id', clientId).eq('user_id', userId).maybeSingle();
  failRead(error);
  if (!client) throw preparationError('CLIENT_NOT_FOUND', 'Client not found or access denied.', 404);
  const { data: sessions, error: sessionError } = await db.from('sessions').select('id,occurred_at')
    .eq('client_id', clientId).eq('user_id', userId).order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(101);
  failRead(sessionError);
  const rows = (sessions || []).slice(0, 100);
  // Direct links to an older encounter remain usable, without silently scanning
  // the entire practice or another client's sessions.
  if (anchorSessionId && !rows.some(row => row.id === anchorSessionId)) {
    const { data: anchor, error: anchorError } = await db.from('sessions').select('id,occurred_at')
      .eq('id', anchorSessionId).eq('client_id', clientId).eq('user_id', userId).maybeSingle();
    failRead(anchorError);
    if (!anchor) throw preparationError('SESSION_NOT_FOUND', 'Session not found for this client.', 404);
    rows.push(anchor);
  }
  if (!rows.length) return { availableSessions: [], limited: false };
  const ids = rows.map(row => row.id);
  const [captureResult, transcriptResult] = await Promise.all([
    db.from('session_capture_drafts').select('session_id,status,reviewed_at,version')
      .eq('client_id', clientId).eq('user_id', userId).eq('status', 'reviewed').in('session_id', ids),
    db.from('zoom_transcripts').select('id,session_ref,source,received_at')
      .eq('client_id', clientId).eq('therapist_user_id', userId).is('deleted_at', null).in('session_ref', ids)
      .order('received_at', { ascending: false }).limit(300)
  ]);
  failRead(captureResult.error); failRead(transcriptResult.error);
  const captures = new Map((captureResult.data || []).filter(row => row.reviewed_at).map(row => [row.session_id, row]));
  const transcripts = transcriptResult.data || [];
  const availableSessions = rows.map(row => ({ sessionId: row.id, occurredAt: row.occurred_at,
    reviewedAt: captures.get(row.id)?.reviewed_at || null, captureVersion: captures.get(row.id)?.version || null,
    linkedTranscripts: transcripts.filter(item => item.session_ref === row.id).map(item => ({ id: item.id, source: item.source }))
  })).filter(row => row.reviewedAt || row.linkedTranscripts.length)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sessionId.localeCompare(a.sessionId));
  return { availableSessions, limited: (sessions || []).length > 100 || transcripts.length === 300 };
}
export async function prepareDocumentSources(db, userId, options, catalogue) {
  const selected = selectDocumentSessions(catalogue.availableSessions, options);
  const sources = [];
  for (const session of selected) {
    const forceTranscript = options.documentPurpose === 'session_summary' && options.transcriptId;
    if (session.reviewedAt && !forceTranscript) {
      const { data, error } = await db.from('session_capture_drafts')
        .select('session_id,content,reviewed_at,version').eq('client_id', options.clientId).eq('user_id', userId)
        .eq('session_id', session.sessionId).eq('status', 'reviewed').maybeSingle();
      failRead(error);
      if (!data?.reviewed_at) throw preparationError('SOURCE_CHANGED', 'A selected Session Capture is no longer reviewed. Refresh the source preview.', 409);
      const content = captureForAudience(data.content, options.audience);
      if (!Object.keys(content).length) throw preparationError('EMPTY_SOURCE', 'A selected Session Capture has no usable content for this audience.', 409);
      sources.push({ id: `capture:${session.sessionId}`, kind: 'session_capture', sessionId: session.sessionId,
        occurredAt: session.occurredAt, reviewedAt: data.reviewed_at, version: data.version,
        label: 'Reviewed Session Capture', content });
    } else {
      if (options.documentPurpose !== 'session_summary') throw preparationError('UNREVIEWED_SOURCE', 'Multi-session reviews use reviewed Session Captures only.', 409);
      const candidate = options.transcriptId
        ? session.linkedTranscripts.find(row => row.id === options.transcriptId) : session.linkedTranscripts[0];
      if (!candidate) throw preparationError('NO_SOURCE_MATERIAL', 'No linked transcript or Zoom summary is available for this session.', 409);
      const { data, error } = await db.from('zoom_transcripts').select('id,original_transcript,zoom_generated_summary,source')
        .eq('id', candidate.id).eq('session_ref', session.sessionId).eq('client_id', options.clientId)
        .eq('therapist_user_id', userId).is('deleted_at', null).maybeSingle();
      failRead(error);
      if (!data) throw preparationError('SOURCE_CHANGED', 'The linked source is no longer available. Refresh the source preview.', 409);
      // One source per encounter: a transcript and its machine summary are not
      // independent corroboration. Prefer the original over its derivative.
      const original = typeof data.original_transcript === 'string' ? data.original_transcript.trim() : '';
      const summary = typeof data.zoom_generated_summary === 'string' ? data.zoom_generated_summary.trim() : '';
      if (!original && !summary) throw preparationError('NO_SOURCE_MATERIAL', 'The linked transcript and Zoom summary are empty.', 409);
      sources.push({ id: `transcript:${data.id}`, kind: original ? 'original_transcript' : 'zoom_summary',
        sessionId: session.sessionId, occurredAt: session.occurredAt, reviewedAt: null,
        label: original ? 'Original linked transcript (not a reviewed capture)' : 'Zoom-generated summary (not a reviewed capture)',
        content: original || summary });
    }
  }
  if (options.includeCare) {
    const { data, error } = await db.from('client_care_items').select('id,kind,body,updated_at,origin,provenance_session_id')
      .eq('client_id', options.clientId).eq('therapist_id', userId).eq('status', 'current')
      .in('kind', CARE_KINDS).order('updated_at', { ascending: false }).limit(30);
    failRead(error);
    for (const item of data || []) if (typeof item.body === 'string' && item.body.trim()) {
      sources.push({ id: `care:${item.id}`, kind: 'accepted_care', careKind: item.kind, updatedAt: item.updated_at,
        provenanceSessionId: item.provenance_session_id, label: 'Current accepted Care (not historical session evidence)', content: item.body.trim() });
    }
  }
  if (options.therapistGuidance.trim()) sources.push({ id: 'therapist:guidance', kind: 'therapist_guidance',
    label: 'Your additions (not a client statement)', content: options.therapistGuidance.trim() });
  if (JSON.stringify(sources).length > 160000) throw preparationError('DOCUMENT_INPUT_TOO_LARGE', 'The selected material is too long. Select fewer sessions or use reviewed Session Captures. Nothing was sent to AI.', 413);
  const sourceVersion = digest({ userId, options, sources });
  const manifest = sources.map(({ content, ...source }) => ({ ...source, contentHash: digest(content),
    url: source.sessionId ? `/clients/${options.clientId}/sessions/${source.sessionId}` : source.kind === 'accepted_care' ? `/clients/${options.clientId}#section-care` : null }));
  const warnings = [];
  if (options.window === 'last_three' && selected.length < 3) warnings.push(`Only ${selected.length} reviewed sessions are available in this window; the document will not imply three.`);
  if (catalogue.limited) warnings.push('The session picker covers the most recent 100 sessions plus an explicitly opened older encounter.');
  if (options.includeCare) warnings.push('Care is the current accepted view, not a snapshot of Care at the historical session date.');
  return { sources, manifest, sourceVersion, selected, warnings };
}
