import { isSampleTranscriptRow } from './sample-practice.js';

// Seed provenance, not a guess based on a transcript title or a person's name.
const SAMPLE_OWNER_REFERENCES = Object.freeze({
  'SAMPLE-NOTE-ALEX-001': 'SAMPLE-001',
  'SAMPLE-NOTE-ALEX-002': 'SAMPLE-001',
  'SAMPLE-NOTE-ALEX-003': 'SAMPLE-001',
  'SAMPLE-NOTE-ALEX-INBOX-004': 'SAMPLE-001',
  'SAMPLE-NOTE-DANIEL-001': 'SAMPLE-003'
});

export function sampleClientIsActive(client) {
  return Boolean(client && client.archived !== true);
}

/** Retire demo sources with their verified sample client, including the deliberately
 * unassigned seed. Real sources and sources moved to a different client are retained.
 * No records are edited or deleted; explicit encounter reads remain available.
 */
export async function visibleInboxTranscripts({ supabase, userId, rows = [] }) {
  const samples = rows.filter(isSampleTranscriptRow);
  if (!samples.length) return rows;
  const clientIds = [...new Set(samples.map(row => row.client_id).filter(Boolean))];
  const references = [...new Set(samples.filter(row => !row.client_id && !row.session_ref)
    .map(row => SAMPLE_OWNER_REFERENCES[row.zoom_note_id]).filter(Boolean))];
  const queries = [];
  const archivedClients = () => supabase.from('clients').select('id,reference,archived')
    .eq('user_id', userId).eq('archived', true);
  if (clientIds.length) queries.push(archivedClients().in('id', clientIds));
  if (references.length) queries.push(archivedClients().in('reference', references));
  const candidates = new Map();
  for (const result of await Promise.all(queries)) {
    if (result.error) throw result.error;
    for (const client of result.data || []) candidates.set(client.id, client);
  }
  const retiredIds = new Set(), retiredReferences = new Set();
  for (const client of candidates.values()) {
    const { data: verified, error } = await supabase.rpc('is_sample_client', {
      p_user_id: userId, p_client_id: client.id
    });
    if (error) throw error;
    if (verified !== true) continue;
    retiredIds.add(client.id);
    retiredReferences.add(client.reference);
  }
  return rows.filter(row => {
    if (!isSampleTranscriptRow(row)) return true;
    if (row.client_id) return !retiredIds.has(row.client_id);
    if (row.session_ref) return true; // An inconsistent assignment needs review, not concealment.
    return !retiredReferences.has(SAMPLE_OWNER_REFERENCES[row.zoom_note_id]);
  });
}
