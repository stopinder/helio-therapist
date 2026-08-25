import { getZoomAccessTokenContext } from './zoom-oauth.js';
import { canonicaliseMyNotesTranscript } from './zoom-webhook.js';

function listItems(payload) {
  if (Array.isArray(payload?.notes)) return payload.notes;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function normaliseZoomNoteList(payload, fallbackMeetingId = null) {
  return listItems(payload)
    .map((note) => ({
      noteId: note?.note_id ? String(note.note_id) : null,
      meetingId: note?.meeting_id ? String(note.meeting_id) : fallbackMeetingId ? String(fallbackMeetingId) : null,
      createdTime: note?.created_time || note?.created_at || null,
      updatedTime: note?.updated_time || note?.modified_time || note?.updated_at || null
    }))
    .filter((note) => note.noteId);
}

export function normaliseZoomMeetingIds(payload) {
  return (Array.isArray(payload?.meetings) ? payload.meetings : [])
    .map((meeting) => meeting?.id ? String(meeting.id) : null)
    .filter(Boolean);
}

async function zoomJson(getToken, url) {
  let token = await getToken({ forceRefresh: false });
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` }
  });

  if (response.status === 401) {
    token = await getToken({ forceRefresh: true });
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}` }
    });
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    const error = new Error(`Zoom My Notes request failed with ${response.status}${responseText ? `: ${responseText}` : ''}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function recentKnownMeetingIds(supabase, therapistUserId) {
  const ids = new Set();

  const { data: links, error: linksError } = await supabase
    .from('zoom_session_links')
    .select('zoom_meeting_id, created_at')
    .eq('therapist_user_id', therapistUserId)
    .not('zoom_meeting_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (linksError?.code !== 'PGRST205' && linksError?.code !== '42P01' && linksError) throw linksError;
  for (const row of links || []) {
    if (row.zoom_meeting_id) ids.add(String(row.zoom_meeting_id));
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('zoom_meeting_id, occurred_at')
    .eq('user_id', therapistUserId)
    .not('zoom_meeting_id', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(20);

  if (sessionsError) throw sessionsError;
  for (const row of sessions || []) {
    if (row.zoom_meeting_id) ids.add(String(row.zoom_meeting_id));
  }

  return ids;
}

async function discoverRecentMeetingIds(getToken, supabase, therapistUserId) {
  const ids = await recentKnownMeetingIds(supabase, therapistUserId);
  const payload = await zoomJson(
    getToken,
    'https://api.zoom.us/v2/users/me/meetings?type=previous_meetings&page_size=30'
  );

  for (const meetingId of normaliseZoomMeetingIds(payload)) ids.add(meetingId);
  return [...ids].slice(0, 30);
}

async function listNotesForMeeting(getToken, meetingId) {
  const payload = await zoomJson(
    getToken,
    `https://api.zoom.us/v2/my_notes/notes?meeting_id=${encodeURIComponent(meetingId)}`
  );
  return normaliseZoomNoteList(payload, meetingId);
}

async function verifiedSessionLink(supabase, therapistUserId, meetingId) {
  if (!meetingId) return null;

  const { data: link, error } = await supabase
    .from('zoom_session_links')
    .select('client_id, session_ref')
    .eq('therapist_user_id', therapistUserId)
    .eq('zoom_meeting_id', meetingId)
    .maybeSingle();

  if (error?.code === 'PGRST205' || error?.code === '42P01') return null;
  if (error) throw error;
  if (!link) return null;

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', link.session_ref)
    .eq('user_id', therapistUserId)
    .eq('client_id', link.client_id)
    .maybeSingle();

  if (sessionError) throw sessionError;
  return session ? link : null;
}

async function uniqueAwaitingSession(supabase, therapistUserId, createdTime) {
  const createdAt = new Date(createdTime || '');
  if (Number.isNaN(createdAt.getTime())) return null;

  const windowStart = new Date(createdAt.getTime() - 90 * 60 * 1000).toISOString();
  const windowEnd = new Date(createdAt.getTime() + 15 * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from('sessions')
    .select('id,client_id,occurred_at')
    .eq('user_id', therapistUserId)
    .eq('workflow_status', 'awaiting_transcript')
    .gte('occurred_at', windowStart)
    .lte('occurred_at', windowEnd)
    .order('occurred_at', { ascending: false })
    .limit(2);

  if (error) throw error;
  if (!candidates || candidates.length !== 1) return null;

  const candidate = candidates[0];
  const { data: existing, error: transcriptError } = await supabase
    .from('zoom_transcripts')
    .select('id')
    .eq('therapist_user_id', therapistUserId)
    .eq('session_ref', candidate.id)
    .limit(1);

  if (transcriptError) throw transcriptError;
  return existing?.length ? null : { client_id: candidate.client_id, session_ref: candidate.id };
}

async function markSessionTranscriptReceived(supabase, therapistUserId, sessionLink, now) {
  if (!sessionLink?.session_ref) return;

  const { error: sessionError } = await supabase
    .from('sessions')
    .update({ workflow_status: 'transcript_received' })
    .eq('id', sessionLink.session_ref)
    .eq('user_id', therapistUserId)
    .eq('client_id', sessionLink.client_id)
    .eq('workflow_status', 'awaiting_transcript');

  if (sessionError) throw sessionError;

  const { error: linkError } = await supabase
    .from('zoom_session_links')
    .update({ status: 'transcript_received', updated_at: now })
    .eq('therapist_user_id', therapistUserId)
    .eq('session_ref', sessionLink.session_ref);

  if (linkError) throw linkError;
}

export async function reconcileZoomMyNotes({ supabase, integration, therapistUserId }) {
  const scopes = new Set(String(integration?.scope || '').split(/\s+/).filter(Boolean));
  if (!scopes.has('my_notes:read:note') || !scopes.has('my_notes:read:content')) {
    const error = new Error('Reconnect Zoom in Settings to grant My Notes access.');
    error.status = 409;
    throw error;
  }

  const getToken = (options) => getZoomAccessTokenContext(supabase, integration, options);
  const meetingIds = await discoverRecentMeetingIds(getToken, supabase, therapistUserId);
  if (!meetingIds.length) return { checked: 0, imported: 0 };

  const notesById = new Map();
  for (const meetingId of meetingIds) {
    const meetingNotes = await listNotesForMeeting(getToken, meetingId);
    for (const note of meetingNotes) notesById.set(note.noteId, note);
  }

  const notes = [...notesById.values()];
  if (!notes.length) return { checked: meetingIds.length, imported: 0 };

  const noteIds = notes.map((note) => note.noteId);
  const { data: existingRows, error: existingError } = await supabase
    .from('zoom_transcripts')
    .select('zoom_note_id')
    .eq('therapist_user_id', therapistUserId)
    .in('zoom_note_id', noteIds);

  if (existingError) throw existingError;
  const existingIds = new Set((existingRows || []).map((row) => String(row.zoom_note_id || '')).filter(Boolean));

  let imported = 0;
  for (const note of notes) {
    if (existingIds.has(note.noteId)) continue;

    const content = await zoomJson(
      getToken,
      `https://api.zoom.us/v2/my_notes/notes/${encodeURIComponent(note.noteId)}/content?include=transcript`
    );

    const structuredTranscript = content?.transcript;
    const originalTranscript = canonicaliseMyNotesTranscript(structuredTranscript);
    if (!originalTranscript) continue;

    const meetingId = note.meetingId || (content?.meeting_id ? String(content.meeting_id) : null);
    const createdTime = note.createdTime || content?.created_time || null;

    let sessionLink = await verifiedSessionLink(supabase, therapistUserId, meetingId);
    if (!sessionLink) sessionLink = await uniqueAwaitingSession(supabase, therapistUserId, createdTime);

    const now = new Date().toISOString();
    const { error: transcriptError } = await supabase
      .from('zoom_transcripts')
      .upsert({
        therapist_user_id: therapistUserId,
        zoom_note_id: note.noteId,
        zoom_meeting_id: meetingId,
        zoom_meeting_uuid: null,
        zoom_recording_file_id: null,
        original_format: 'JSON',
        original_transcript: originalTranscript,
        structured_transcript: structuredTranscript,
        source: 'zoom_my_notes',
        client_id: sessionLink?.client_id || null,
        session_ref: sessionLink?.session_ref || null,
        status: sessionLink ? 'ready' : 'unassigned',
        updated_at: now
      }, { onConflict: 'therapist_user_id,zoom_note_id' });

    if (transcriptError) throw transcriptError;
    await markSessionTranscriptReceived(supabase, therapistUserId, sessionLink, now);
    imported += 1;
  }

  return { checked: meetingIds.length, imported };
}
