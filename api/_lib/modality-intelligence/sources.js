import { createHash } from 'node:crypto';
import { assertSourceAvailable, assertDocumentSourcesUsable } from '../source-review.js';
import { summaryClinicalEvidence } from '../../../src/lib/summaryEvidence.js';
import { isUnusableSummary } from '../../../src/lib/summarySafety.js';
import { failure } from './contracts.js';

const CAPTURE_FIELDS = ['presentingConcerns','sessionThemes','interventionsUsed','clientResponse','progressGoals','planNextSession','whatHappened','themes','interventions','outcomes','learning'];
const CARE_KINDS = new Set(['current_focus','shared_understanding','trying','change_noticed','learning','themes','interventions','outcomes']);
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function rows(query) { const { data, error } = await query; if (error) throw error; return data || []; }
async function one(query) { const { data, error } = await query.maybeSingle(); if (error) throw error; return data; }

/** Owner/client boundaries are applied before any text is read or any model runs.
 * No schema changes, writes, caches or clinical-text logging are performed here.
 */
export async function loadModalitySources(db, userId, request, { forViewing = false } = {}) {
  const client = await one(db.from('clients').select('id,display_name,reference,archived').eq('id',request.clientId).eq('user_id',userId));
  if (!client) throw failure('CLIENT_NOT_FOUND','Client not found or access denied.',404);
  if (client.archived && !forViewing) throw failure('CLIENT_ARCHIVED','Restore this client before preparing new clinical material.',409);
  const anchorId = request.sessionId || request.anchorSessionId || null;
  let anchor = null;
  if (anchorId) {
    anchor = await one(db.from('sessions').select('id,client_id,user_id,occurred_at').eq('id',anchorId).eq('client_id',client.id).eq('user_id',userId));
    if (!anchor) throw failure('SESSION_NOT_FOUND','The selected session is not available for this client.',404);
  }
  const count = ['current'].includes(request.window) ? 1 : ['recent','last_three'].includes(request.window) ? 3 : request.window === 'last_five' ? 5 : 30;
  let query = db.from('sessions').select('id,client_id,user_id,occurred_at').eq('client_id',client.id).eq('user_id',userId);
  if (anchor) query = query.lte('occurred_at',anchor.occurred_at);
  let sessions = await rows(query.order('occurred_at',{ascending:false}).limit(request.window === 'history' ? 31 : count + 1));
  if (request.window === 'history' && sessions.length > 30) throw failure('EVIDENCE_WINDOW_TOO_LARGE','Choose a shorter evidence window. This preview supports up to 30 sessions at a time.',413);
  // Anchor always wins ties, and no later encounter can enter the window.
  if (anchor) sessions = [anchor, ...sessions.filter(session => session.id !== anchor.id)];
  sessions = sessions.slice(0,count);
  if (!sessions.length) throw failure('NO_SOURCE_MATERIAL','There are no sessions available for this client.',409);
  const sessionIds = sessions.map(session => session.id);
  const [transcripts, captures, documents, careItems] = await Promise.all([
    rows(db.from('zoom_transcripts').select('id,client_id,session_ref,original_transcript,zoom_generated_summary,source_version,source_review,received_at').eq('therapist_user_id',userId).eq('client_id',client.id).in('session_ref',sessionIds).is('deleted_at',null).order('received_at',{ascending:false})),
    rows(db.from('session_capture_drafts').select('session_id,client_id,user_id,content,status,reviewed_at').eq('user_id',userId).eq('client_id',client.id).in('session_id',sessionIds).eq('status','reviewed').not('reviewed_at','is',null)),
    rows(db.from('documents').select('id,client_id,user_id,document_type,content,source_manifest,updated_at,version').eq('user_id',userId).eq('client_id',client.id).eq('document_type','session_summary').is('archived_at',null).order('updated_at',{ascending:false}).limit(200)),
    rows(db.from('client_care_items').select('id,client_id,therapist_id,kind,body,status,updated_at').eq('therapist_id',userId).eq('client_id',client.id).eq('status','current').limit(30))
  ]);
  const sources = [], manifest = [], zoomSummaries = [], warnings = [], selectedDocuments = [];
  const sourceIds = new Set();
  const add = (id, type, text, session, secondary, extra = {}) => {
    if (!String(text || '').trim() || sourceIds.has(id)) return false;
    sourceIds.add(id);
    sources.push({ id, type, text: String(text).trim(), encounterId: session?.id || null, occurredAt: session?.occurred_at || null, secondary, ...extra });
    return true;
  };
  for (const session of sessions) {
    const linked = transcripts.filter(row => row.session_ref === session.id);
    if (!forViewing) for (const row of linked) assertSourceAvailable(row);
    const transcript = request.transcriptId && session.id === anchorId
      ? linked.find(row => row.id === request.transcriptId)
      : linked[0];
    if (request.transcriptId && session.id === anchorId && !transcript) throw failure('TRANSCRIPT_NOT_FOUND','The selected transcript does not belong to this session.',404);
    for (const row of transcript ? [transcript] : []) {
      if (row.zoom_generated_summary?.trim()) zoomSummaries.push({ id:row.id, sessionId:session.id, occurredAt:session.occurred_at, text:row.zoom_generated_summary.trim(), sourceVersion:row.source_version, needsReview:['needs_review','separated'].includes(row.source_review?.state) });
    }
    if (transcript) {
      add(`transcript:${transcript.id}`,'transcript',transcript.original_transcript,session,false);
      if (request.intelligenceOptions.includeZoomSummary) add(`zoom:${transcript.id}`,'zoom_summary',transcript.zoom_generated_summary,session,true);
      if (transcript.source_review?.state === 'confirmed') add(`clarification:${transcript.id}`,'therapist_clarification',transcript.source_review.context,session,false);
      manifest.push({id:`transcript:${transcript.id}`,kind:'zoom_transcript',transcriptId:transcript.id,sessionId:session.id,sourceVersion:transcript.source_version,occurredAt:session.occurred_at,hasTranscript:Boolean(transcript.original_transcript?.trim()),hasZoomSummary:request.intelligenceOptions.includeZoomSummary && Boolean(transcript.zoom_generated_summary?.trim())});
    }
    const capture = captures.find(row => row.session_id === session.id);
    const captureText = capture ? CAPTURE_FIELDS.filter(key => typeof capture.content?.[key] === 'string' && capture.content[key].trim()).map(key => `${key}: ${capture.content[key]}`).join('\n\n') : '';
    if (captureText) {
      add(`capture:${session.id}`,'reviewed_session_capture',captureText,session,false);
      manifest.push({id:`capture:${session.id}`,kind:'session_capture',sessionId:session.id,reviewedAt:capture.reviewed_at});
    }
    if (!transcript?.original_transcript?.trim() && !captureText) {
      const document = documents.find(doc => !isUnusableSummary(doc.content) && doc.content?.summaryGeneration?.mode !== 'therapist_formulation' && doc.source_manifest?.some(source => source.sessionId === session.id));
      if (document) {
        if (!forViewing) await assertDocumentSourcesUsable(db,userId,document);
        // A longitudinal derivative can link several sessions, but remains one
        // secondary source: never count it as independent corroboration.
        if (add(`document:${document.id}`,'prior_session_summary',summaryClinicalEvidence(document.content?.body),session,true)) {
          selectedDocuments.push(document);
          manifest.push({id:`document:${document.id}`,kind:'session_summary',documentId:document.id,sessionId:session.id,updatedAt:document.updated_at});
        }
      }
    }
  }
  for (const item of careItems.filter(item => CARE_KINDS.has(item.kind))) {
    add(`care:${item.id}`,'accepted_care',item.body,null,false);
    manifest.push({id:`care:${item.id}`,kind:'accepted_care',careKind:item.kind});
  }
  if (request.therapistGuidance.trim()) {
    add('therapist:guidance','therapist_context',request.therapistGuidance,null,false);
    manifest.push({id:'therapist:guidance',kind:'therapist_guidance'});
  }
  if (request.refinementRequest?.trim()) add('therapist:instructions','therapist_instructions',request.refinementRequest,null,false);
  const encounterSources = sources.filter(source => source.encounterId);
  if (!forViewing && !encounterSources.length) throw failure('NO_SOURCE_MATERIAL','No selected source material is available. Review the Zoom summary or choose another session.',409);
  if (encounterSources.length && encounterSources.every(source => source.secondary)) warnings.push('Only secondary summaries are available in this window. Review interpretations against the original encounter wherever possible.');
  const omitted = sessions.filter(session => !encounterSources.some(source => source.encounterId === session.id));
  if (omitted.length) warnings.push(`${omitted.length} selected session(s) have no included clinical material and cannot support a claim about continuity.`);
  const sourceChars = sources.reduce((total,source) => total + source.text.length,0);
  if (!forViewing && sourceChars > 160000) throw failure('EVIDENCE_WINDOW_TOO_LARGE','The selected material is too large for one draft. Choose a shorter evidence window; no material has been silently dropped.',413);
  const snapshot = fingerprint({ client, sessions, sources, versions:transcripts.map(row => [row.id,row.source_version,row.source_review]), captures, documents:selectedDocuments.map(doc=>[doc.id,doc.updated_at,doc.version]), careItems });
  return { client, sessions, sources, manifest, zoomSummaries, warnings, snapshot, sessionCount:new Set(encounterSources.map(source=>source.encounterId)).size };
}
export async function verifyModalitySources(db,userId,request,original) {
  const current = await loadModalitySources(db,userId,request);
  if (current.snapshot !== original.snapshot) throw failure('SOURCE_CHANGED','Source evidence changed during generation. Reload before retrying; your previous draft is unchanged.',409);
}

/** Metadata-only source picker; unreviewed/flagged sources stay visible for explicit review. */
export async function listModalityAvailability(db,userId,clientId) {
  const client=await one(db.from('clients').select('id').eq('id',clientId).eq('user_id',userId));
  if(!client)throw failure('CLIENT_NOT_FOUND','Client not found or access denied.',404);
  const sessions=await rows(db.from('sessions').select('id,occurred_at').eq('client_id',clientId).eq('user_id',userId).order('occurred_at',{ascending:false}).limit(200));
  const ids=sessions.map(session=>session.id);
  if(!ids.length)return [];
  const [transcripts,captures,documents]=await Promise.all([
    rows(db.from('zoom_transcripts').select('id,session_ref,source_review').eq('therapist_user_id',userId).eq('client_id',clientId).in('session_ref',ids).is('deleted_at',null)),
    rows(db.from('session_capture_drafts').select('session_id,reviewed_at').eq('user_id',userId).eq('client_id',clientId).in('session_id',ids).eq('status','reviewed').not('reviewed_at','is',null)),
    rows(db.from('documents').select('id,source_manifest').eq('user_id',userId).eq('client_id',clientId).eq('document_type','session_summary').is('archived_at',null).order('updated_at',{ascending:false}).limit(200))
  ]);
  return sessions.filter(session=>transcripts.some(row=>row.session_ref===session.id)||captures.some(row=>row.session_id===session.id)||documents.some(doc=>doc.source_manifest?.some(source=>source.sessionId===session.id)))
    .map(session=>({sessionId:session.id,occurredAt:session.occurred_at,reviewedAt:captures.find(row=>row.session_id===session.id)?.reviewed_at||null,sourceType:transcripts.some(row=>row.session_ref===session.id)?'original_encounter':'reviewed_material',needsReview:transcripts.some(row=>row.session_ref===session.id&&['needs_review','separated'].includes(row.source_review?.state))}));
}
