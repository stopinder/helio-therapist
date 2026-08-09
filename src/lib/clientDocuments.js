import { supabase } from './supabase.js';

const DOCUMENT_FIELDS = 'id,client_id,client_ref,client_name,title,document_type,report_date,status,content,source_manifest,purpose,recipient,period_start,period_end,version,finalized_at,storage_path,original_filename,mime_type,size_bytes,created_at,updated_at';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

async function requireUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Please sign in again');
  return data.user;
}

export function presentClientDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    clientRef: row.client_ref,
    clientName: row.client_name,
    title: row.title,
    documentType: row.document_type,
    reportDate: row.report_date,
    status: row.status,
    content: row.content || {},
    sourceManifest: Array.isArray(row.source_manifest) ? row.source_manifest : [],
    purpose: row.purpose || '',
    recipient: row.recipient || '',
    periodStart: row.period_start,
    periodEnd: row.period_end,
    version: row.version || 1,
    finalizedAt: row.finalized_at,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listClientDocuments(clientId) {
  const client = requireSupabase();
  await requireUser(client);
  const { data, error } = await client.from('documents').select(DOCUMENT_FIELDS).eq('client_id', clientId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(presentClientDocument);
}

export async function getClientDocument({ clientId, documentId }) {
  const client = requireSupabase();
  await requireUser(client);
  const { data, error } = await client.from('documents').select(DOCUMENT_FIELDS).eq('id', documentId).eq('client_id', clientId).single();
  if (error) throw error;
  return presentClientDocument(data);
}

export async function createClientDocumentDraft({ client, title, documentType = 'clinical_summary', purpose = '', recipient = '', periodStart = null, periodEnd = null, content = {}, sourceManifest = [] }) {
  const db = requireSupabase();
  const user = await requireUser(db);
  const { data, error } = await db.from('documents').insert({
    user_id: user.id,
    client_id: client.id,
    client_ref: client.id,
    client_name: client.display_name,
    title: title.trim(),
    document_type: documentType,
    status: 'draft',
    purpose,
    recipient,
    period_start: periodStart || null,
    period_end: periodEnd || null,
    content,
    source_manifest: sourceManifest
  }).select(DOCUMENT_FIELDS).single();
  if (error) throw error;
  return presentClientDocument(data);
}

export async function saveClientDocumentDraft(document, changes) {
  const client = requireSupabase();
  await requireUser(client);
  const payload = {
    title: changes.title?.trim() || document.title,
    document_type: changes.documentType || document.documentType,
    purpose: changes.purpose ?? document.purpose,
    recipient: changes.recipient ?? document.recipient,
    period_start: changes.periodStart ?? document.periodStart,
    period_end: changes.periodEnd ?? document.periodEnd,
    content: changes.content ?? document.content,
    source_manifest: changes.sourceManifest ?? document.sourceManifest,
    version: document.version + 1,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client.from('documents').update(payload).eq('id', document.id).eq('client_id', document.clientId).eq('version', document.version).select(DOCUMENT_FIELDS).maybeSingle();
  if (error) throw error;
  if (!data) {
    const conflict = new Error('This document changed in another tab. Reopen it before saving again.');
    conflict.code = 'DOCUMENT_CONFLICT';
    throw conflict;
  }
  return presentClientDocument(data);
}

export async function listDocumentSourceSessions(clientId) {
  const client = requireSupabase();
  await requireUser(client);
  const { data, error } = await client.from('sessions').select('id,client_id,occurred_at,status,notes,notes_status,version,completed_at').eq('client_id', clientId).eq('status', 'completed').order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, occurredAt: row.occurred_at, notes: row.notes || '', notesStatus: row.notes_status, version: row.version, completedAt: row.completed_at }));
}

export async function downloadClientDocument(document) {
  if (!document?.storagePath) throw new Error('This document has not been finalised yet');
  const client = requireSupabase();
  await requireUser(client);
  const { data, error } = await client.storage.from('client-documents').createSignedUrl(document.storagePath, 60);
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
