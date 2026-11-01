import { getSupabaseUserClient, requireAuthenticatedUser } from './_lib/supabase.js';
import {
  SAMPLE_TRANSCRIPT_SOURCE,
  canonicalSampleTranscript,
  sampleCaptureDraftForTranscript,
  sampleStructuredTranscript
} from './_lib/sample-practice.js';

const SAMPLE_REFS = ['SAMPLE-001', 'SAMPLE-002', 'SAMPLE-003', 'SAMPLE-004'];

function isoDaysAgo(days, hour = 10) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function sampleTranscriptRow({ userId, clientId = null, sessionId = null, noteId, meetingId, title, occurredAt, structured, zoomSummary }) {
  return {
    therapist_user_id: userId,
    client_id: clientId,
    session_ref: sessionId ? String(sessionId) : null,
    zoom_note_id: noteId,
    zoom_meeting_id: meetingId,
    zoom_meeting_uuid: null,
    zoom_recording_file_id: null,
    original_format: 'JSON',
    original_transcript: canonicalSampleTranscript(structured),
    structured_transcript: structured,
    zoom_generated_summary: zoomSummary,
    source: SAMPLE_TRANSCRIPT_SOURCE,
    source_title: title,
    source_occurred_at: occurredAt,
    status: clientId && sessionId ? 'ready' : 'unassigned',
    source_retention: 'keep_until_review',
    attention_cleared_at: null,
    deleted_at: null,
    updated_at: new Date().toISOString()
  };
}

async function ensureBaseWorkspace({ service, userClient, userId }) {
  const { data: clients, error } = await service
    .from('clients')
    .select('id,reference,display_name')
    .eq('user_id', userId);
  if (error) throw error;

  if (!(clients || []).length) {
    const { error: seedError } = await userClient.rpc('create_sample_workspace');
    if (seedError) throw seedError;
    const { data: marked, error: markError } = await service.rpc('mark_sample_workspace_clients', { p_user_id: userId });
    if (markError || Number(marked || 0) < 4) throw markError || new Error('Sample client markers could not be created.');
  } else {
    const { data: verified, error: verifyError } = await service.rpc('is_sample_workspace', { p_user_id: userId });
    if (verifyError) throw verifyError;
    if (!verified) {
      const err = new Error('Sample practice can only be added to an empty workspace.');
      err.status = 409;
      err.code = 'SAMPLE_WORKSPACE_NOT_EMPTY';
      throw err;
    }
  }

  const { data: sampleClients, error: sampleError } = await service
    .from('clients')
    .select('id,reference,display_name')
    .eq('user_id', userId)
    .in('reference', SAMPLE_REFS);
  if (sampleError) throw sampleError;

  const byRef = new Map((sampleClients || []).map(client => [client.reference, client]));
  if (SAMPLE_REFS.some(ref => !byRef.has(ref))) {
    const err = new Error('The sample practice is incomplete. Try adding it again.');
    err.status = 409;
    err.code = 'SAMPLE_WORKSPACE_INCOMPLETE';
    throw err;
  }
  return byRef;
}

async function ensureThirdAlexSession({ service, userClient, userId, alexId }) {
  const { data: existing, error } = await service
    .from('sessions')
    .select('id,occurred_at,status,version,legacy_ref')
    .eq('user_id', userId)
    .eq('client_id', alexId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;

  let third = (existing || []).find(session => session.legacy_ref === 'SAMPLE-ALEX-003');
  if (!third) {
    const { data: inserted, error: insertError } = await userClient
      .from('sessions')
      .insert({
        user_id: userId,
        client_id: alexId,
        occurred_at: isoDaysAgo(1, 17),
        status: 'in_progress',
        workflow_status: 'no_further_action',
        notes: '',
        notes_status: 'draft',
        legacy_ref: 'SAMPLE-ALEX-003'
      })
      .select('id,occurred_at,status,version,legacy_ref')
      .single();
    if (insertError) throw insertError;

    const { data: completed, error: completeError } = await userClient.rpc('complete_session', {
      p_session_id: inserted.id,
      p_notes: 'Alex described noticing the urge to reopen work messages after a difficult team exchange. He paused before checking, used the agreed stopping time, and reported that the anxiety reduced without further action. Reviewed what made the pause possible and agreed to continue testing flexible standards on lower-stakes work. Synthetic sample data.',
      p_expected_version: inserted.version
    });
    if (completeError) throw completeError;
    third = Array.isArray(completed) ? completed[0] : completed;
  }

  const ordered = [...(existing || []).filter(session => session.legacy_ref !== 'SAMPLE-ALEX-003'), third]
    .filter(Boolean)
    .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)));
  return ordered.slice(-3);
}

const ALEX_TRANSCRIPTS = [
  {
    noteId: 'SAMPLE-NOTE-ALEX-001',
    meetingId: 'sample-alex-001',
    title: 'Alex Morgan — Sample',
    zoomSummary: '## Key Outcomes\nAlex described increased evening rumination during a demanding work period and identified late-night message checking as a behaviour that keeps work mentally active.\n## Decisions & Agreements\n- Trial a 20-minute wind-down routine.\n- Stop work-message checking after 20:30.',
    turns: [
      { speaker: 'client', text: 'I finish work but I keep checking because I am worried I have missed something.' },
      { speaker: 'therapist', text: 'What happens to the worry just after you check?' },
      { speaker: 'client', text: 'It drops for a minute, then I think of something else I should look at.' },
      { speaker: 'therapist', text: 'So checking gives short relief but keeps you connected to work.' },
      { speaker: 'client', text: 'Yes, and then I am still awake much later.' },
      { speaker: 'therapist', text: 'Let us test a clear stopping time and a short wind-down rather than trying to force the anxiety away.' }
    ]
  },
  {
    noteId: 'SAMPLE-NOTE-ALEX-002',
    meetingId: 'sample-alex-002',
    title: 'Alex Morgan — Sample',
    zoomSummary: '## Key Outcomes\nAlex reported fewer late-night checks and somewhat easier sleep on evenings when the stopping time was maintained.\n## Decisions & Agreements\n- Continue the wind-down routine.\n- Test a good-enough standard on one low-stakes task.',
    turns: [
      { speaker: 'client', text: 'The nights I did not reopen Teams were definitely easier.' },
      { speaker: 'therapist', text: 'What helped you leave it alone?' },
      { speaker: 'client', text: 'I reminded myself that if it was genuinely urgent someone would call.' },
      { speaker: 'therapist', text: 'And what happened to the fear that something would go wrong?' },
      { speaker: 'client', text: 'It was still there but it was not as convincing after a while.' },
      { speaker: 'therapist', text: 'Let us add one low-stakes task where good enough is the experiment.' }
    ]
  },
  {
    noteId: 'SAMPLE-NOTE-ALEX-003',
    meetingId: 'sample-alex-003',
    title: 'Alex Morgan — Sample',
    zoomSummary: '## Key Outcomes\nAlex noticed the urge to check messages after a difficult team exchange but paused and kept the agreed stopping time. The anxiety reduced without further checking.\n## Decisions & Agreements\n- Continue the stopping-time experiment.\n- Notice what makes pausing easier before acting on the urge to check.',
    turns: [
      { speaker: 'client', text: 'After the team call I really wanted to reopen everything and make sure I had not sounded stupid.' },
      { speaker: 'therapist', text: 'You noticed the urge before acting on it this time.' },
      { speaker: 'client', text: 'Yes. I made tea and waited ten minutes first.' },
      { speaker: 'therapist', text: 'What happened during those ten minutes?' },
      { speaker: 'client', text: 'The feeling dropped enough that I could see checking would just start the whole evening again.' },
      { speaker: 'therapist', text: 'That gives us a useful exception to the usual checking cycle.' }
    ]
  }
];

const DANIEL_WORKED = {
  noteId: 'SAMPLE-NOTE-DANIEL-001',
  meetingId: 'sample-daniel-001',
  title: 'Daniel Reed — Sample',
  zoomSummary: '## Key Outcomes\nDaniel described anticipatory anxiety before social situations and a tendency to leave early when he predicts rejection. The session moved toward a small behavioural experiment rather than trying to remove anxiety first.\n## Decisions & Agreements\n- Have a short coffee with a colleague.\n- Record the prediction beforehand and what actually happens.',
  turns: [
    { speaker: 'client', text: 'I usually decide they are not interested before anything has really happened.' },
    { speaker: 'therapist', text: 'What do you tend to do once that prediction shows up?' },
    { speaker: 'client', text: 'I make an excuse and leave, or I do not go in the first place.' },
    { speaker: 'therapist', text: 'So the prediction never gets much of a test.' },
    { speaker: 'client', text: 'No. I suppose I only collect evidence that I escaped it.' },
    { speaker: 'therapist', text: 'What would be small enough to test without making this an ordeal?' },
    { speaker: 'client', text: 'A coffee with someone from work. Twenty minutes, maybe.' }
  ]
};

const SAMPLE_INBOX = {
  noteId: 'SAMPLE-NOTE-ALEX-INBOX-004',
  meetingId: 'sample-alex-inbox-004',
  title: 'Alex Morgan — Sample',
  zoomSummary: '## Key Outcomes\nA new synthetic Zoom note is waiting to be matched to the existing Alex Morgan — Sample client.\n## Decisions & Agreements\n- Review the client clues and encounter date.\n- Assign the import from Transcript Inbox.',
  turns: [
    { speaker: 'client', text: 'I noticed the checking urge again after a late email, but I did not act on it straight away.' },
    { speaker: 'therapist', text: 'What helped you create that gap this time?' },
    { speaker: 'client', text: 'I remembered that the last time I waited, the urgency dropped by itself.' },
    { speaker: 'therapist', text: 'That gives us another example to compare with the earlier sessions.' }
  ]
};

const DANIEL_CARE_ITEMS = [
  { kind: 'current_focus', body: 'Build confidence in ordinary social situations without making the absence of anxiety the condition for taking part.' },
  { kind: 'current_focus', body: 'Reduce early withdrawal from manageable social contact and increase opportunities for corrective experience.' },
  { kind: 'shared_understanding', body: 'Daniel often predicts rejection before there is enough evidence, then leaves or avoids the situation; this reduces anxiety briefly but prevents the prediction being tested.' },
  { kind: 'trying', body: 'Use a three-step confidence ladder for social situations and record the prediction, what actually happened, and the urge to leave.' },
  { kind: 'trying', body: 'Complete one brief coffee with a colleague and remain for the agreed twenty minutes unless there is a genuine reason to leave.' },
  { kind: 'change_noticed', body: 'Daniel is beginning to recognise anxious predictions as predictions rather than treating them as established facts.' },
  { kind: 'learning', body: 'Leaving early reduces discomfort quickly, but it also removes the chance to discover whether the feared rejection would actually occur.' }
];

async function ensureTranscript(service, row) {
  const { data: existing, error: existingError } = await service
    .from('zoom_transcripts')
    .select('id,zoom_note_id,client_id,session_ref,source')
    .eq('therapist_user_id', row.therapist_user_id)
    .eq('zoom_note_id', row.zoom_note_id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await service
    .from('zoom_transcripts')
    .insert(row)
    .select('id,zoom_note_id,client_id,session_ref,source')
    .single();
  if (error?.code === '23505') {
    const { data: concurrent, error: retryError } = await service
      .from('zoom_transcripts')
      .select('id,zoom_note_id,client_id,session_ref,source')
      .eq('therapist_user_id', row.therapist_user_id)
      .eq('zoom_note_id', row.zoom_note_id)
      .single();
    if (retryError) throw retryError;
    return concurrent;
  }
  if (error) throw error;
  return data;
}

async function ensureAlexTranscriptHistory({ service, userId, alex, sessions }) {
  const transcripts = [];
  for (let index = 0; index < sessions.length; index += 1) {
    const seed = ALEX_TRANSCRIPTS[index] || ALEX_TRANSCRIPTS[ALEX_TRANSCRIPTS.length - 1];
    const session = sessions[index];
    const structured = sampleStructuredTranscript({ therapist: 'Therapist', client: 'Alex Morgan — Sample', turns: seed.turns });
    const transcript = await ensureTranscript(service, sampleTranscriptRow({
      userId,
      clientId: alex.id,
      sessionId: session.id,
      noteId: seed.noteId,
      meetingId: seed.meetingId,
      title: seed.title,
      occurredAt: session.occurred_at,
      structured,
      zoomSummary: seed.zoomSummary
    }));
    transcripts.push({ ...transcript, sessionId: session.id, occurredAt: session.occurred_at });

    const capture = sampleCaptureDraftForTranscript(
      { ...transcript, zoom_note_id: seed.noteId, source: SAMPLE_TRANSCRIPT_SOURCE },
      { sampleVerified: true }
    );
    const now = new Date().toISOString();
    const { data: existingCapture, error: captureReadError } = await service
      .from('session_capture_drafts')
      .select('session_id')
      .eq('session_id', session.id)
      .maybeSingle();
    if (captureReadError) throw captureReadError;
    if (!existingCapture) {
      const { error: captureError } = await service
        .from('session_capture_drafts')
        .insert({
          session_id: session.id,
          user_id: userId,
          client_id: alex.id,
          transcript_id: transcript.id,
          speaker_identities: { Therapist: 'Therapist', 'Alex Morgan — Sample': 'Client' },
          generated_content: capture,
          content: capture,
          evidence: { sample: true, source: 'sample_practice_2' },
          therapist_guidance: '',
          dismissed_fields: [],
          previous_versions: [],
          status: 'reviewed',
          version: 1,
          reviewed_at: now,
          updated_at: now
        });
      if (captureError?.code !== '23505' && captureError) throw captureError;
    }
  }
  return transcripts;
}

async function ensureDanielWorkedExample({ service, userId, daniel }) {
  const { data: session, error: sessionError } = await service
    .from('sessions')
    .select('id,occurred_at,status')
    .eq('user_id', userId)
    .eq('client_id', daniel.id)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new Error('Daniel sample session is missing.');

  const structured = sampleStructuredTranscript({ therapist: 'Therapist', client: 'Daniel Reed — Sample', turns: DANIEL_WORKED.turns });
  const transcript = await ensureTranscript(service, sampleTranscriptRow({
    userId,
    clientId: daniel.id,
    sessionId: session.id,
    noteId: DANIEL_WORKED.noteId,
    meetingId: DANIEL_WORKED.meetingId,
    title: DANIEL_WORKED.title,
    occurredAt: session.occurred_at,
    structured,
    zoomSummary: DANIEL_WORKED.zoomSummary
  }));

  const capture = sampleCaptureDraftForTranscript(
    { ...transcript, zoom_note_id: DANIEL_WORKED.noteId, source: SAMPLE_TRANSCRIPT_SOURCE },
    { sampleVerified: true }
  );
  const now = new Date().toISOString();
  const { data: existingCapture, error: captureReadError } = await service
    .from('session_capture_drafts')
    .select('session_id')
    .eq('session_id', session.id)
    .maybeSingle();
  if (captureReadError) throw captureReadError;
  if (!existingCapture) {
    const { error: captureError } = await service.from('session_capture_drafts').insert({
      session_id: session.id,
      user_id: userId,
      client_id: daniel.id,
      transcript_id: transcript.id,
      speaker_identities: { Therapist: 'Therapist', 'Daniel Reed — Sample': 'Client' },
      generated_content: capture,
      content: capture,
      evidence: { sample: true, source: 'sample_practice_visible_story' },
      therapist_guidance: '',
      dismissed_fields: [],
      previous_versions: [],
      status: 'reviewed',
      version: 1,
      reviewed_at: now,
      updated_at: now
    });
    if (captureError?.code !== '23505' && captureError) throw captureError;
  }

  const { data: existingCare, error: careReadError } = await service
    .from('client_care_items')
    .select('kind,body,status')
    .eq('therapist_id', userId)
    .eq('client_id', daniel.id);
  if (careReadError) throw careReadError;
  const existingCareKeys = new Set((existingCare || []).map(item => `${item.kind}::${item.body}`));
  const missingCare = DANIEL_CARE_ITEMS.filter(item => !existingCareKeys.has(`${item.kind}::${item.body}`))
    .map(item => ({ therapist_id:userId, client_id:daniel.id, kind:item.kind, body:item.body, status:'current', origin:'clinician', provenance_session_id:session.id }));
  if (missingCare.length) {
    const { error: careInsertError } = await service.from('client_care_items').insert(missingCare);
    if (careInsertError) throw careInsertError;
  }

  const summaryTitle = 'Sample session summary — Daniel';
  const { data: existingSummary, error: summaryReadError } = await service
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', daniel.id)
    .eq('title', summaryTitle)
    .maybeSingle();
  if (summaryReadError) throw summaryReadError;
  let summaryDocument = existingSummary;
  if (!summaryDocument) {
    const { data, error } = await service.from('documents').insert({
      user_id:userId,
      client_id:daniel.id,
      client_ref:daniel.reference || String(daniel.id),
      client_name:daniel.display_name,
      title:summaryTitle,
      document_type:'session_summary',
      status:'draft',
      purpose:'Worked sample of a transcript-backed session summary.',
      recipient:'Therapist review',
      content:{
        body:'Daniel described anticipatory anxiety and self-consciousness before social situations, with a pattern of predicting rejection and leaving or avoiding contact early. The session focused on separating prediction from evidence and agreeing a manageable behavioural experiment: a brief coffee with a colleague, remaining for the agreed twenty minutes and recording the prediction versus what actually happened. Daniel recognised that leaving early reduces anxiety in the moment but prevents new learning. No risk or safeguarding concern is included in this synthetic example.',
        sample:true,
        sample_kind:'session_summary'
      },
      source_manifest:[{kind:'zoom_transcript',id:transcript.id,sessionId:session.id,occurredAt:session.occurred_at,sample:true}]
    }).select('id').single();
    if (error) throw error;
    summaryDocument = data;
  }

  const planTitle = 'Sample care plan — Daniel';
  const { data: existingPlan, error: planReadError } = await service
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', daniel.id)
    .eq('title', planTitle)
    .maybeSingle();
  if (planReadError) throw planReadError;
  if (!existingPlan) {
    const { error } = await service.from('documents').insert({
      user_id:userId,
      client_id:daniel.id,
      client_ref:daniel.reference || String(daniel.id),
      client_name:daniel.display_name,
      title:planTitle,
      document_type:'treatment_plan',
      status:'draft',
      purpose:'Show how aims, formulation and agreed next steps can be held together.',
      recipient:'Clinical record',
      content:{
        body:'Aims and objectives\n• Build confidence in manageable social situations.\n• Reduce early withdrawal driven by anxious prediction.\n\nShared understanding\nDaniel often predicts rejection before enough evidence is available. Leaving early reduces discomfort quickly but also prevents the prediction being tested.\n\nCurrent plan\nUse a graded confidence ladder, complete one short coffee with a colleague, and record the prediction, outcome and urge to leave. Review the result collaboratively at the next session.',
        goals:['Build confidence in manageable social situations','Reduce early withdrawal driven by anxious prediction','Increase opportunities for corrective learning'],
        sample:true,
        sample_kind:'care_plan'
      },
      source_manifest:[{kind:'session',id:session.id,sample:true}]
    });
    if (error) throw error;
  }

  return { transcript, session, summaryDocument };
}

async function ensureSampleInboxTranscript({ service, userId }) {
  const structured = sampleStructuredTranscript({ therapist: 'Therapist', client: 'Alex Morgan — Sample', turns: SAMPLE_INBOX.turns });
  return ensureTranscript(service, sampleTranscriptRow({
    userId,
    noteId: SAMPLE_INBOX.noteId,
    meetingId: SAMPLE_INBOX.meetingId,
    title: SAMPLE_INBOX.title,
    occurredAt: isoDaysAgo(0, 9),
    structured,
    zoomSummary: SAMPLE_INBOX.zoomSummary
  }));
}

async function ensureSampleSummaryDocument({ service, userId, alex, transcripts }) {
  const title = 'Sample longitudinal summary — Alex';
  const { data: existing, error: existingError } = await service
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', alex.id)
    .eq('title', title)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const sourceManifest = transcripts.map(item => ({
    kind: 'zoom_transcript',
    id: item.id,
    sessionId: item.sessionId,
    occurredAt: item.occurredAt,
    sample: true
  }));
  const content = {
    body: 'Across the three sample sessions, work-related anxiety repeatedly led to evening checking and difficulty disengaging. Alex reported fewer late-night checks and somewhat easier sleep when using a clear stopping time and wind-down routine. The most recent session adds an important exception: after a difficult team exchange, Alex noticed the urge to check, paused, and allowed the anxiety to reduce without reopening messages. This synthetic summary is included to demonstrate longitudinal Clinical Intelligence without using your AI allowance.',
    sample: true,
    sample_kind: 'longitudinal_summary'
  };
  const { data, error } = await service
    .from('documents')
    .insert({
      user_id: userId,
      client_id: alex.id,
      client_ref: String(alex.id),
      client_name: alex.display_name,
      title,
      document_type: 'session_summary',
      status: 'draft',
      purpose: 'Demonstrate longitudinal Clinical Intelligence using synthetic sample sessions.',
      recipient: 'Therapist review',
      content,
      source_manifest: sourceManifest
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { supabase: service, user } = await requireAuthenticatedUser(req);
    const userClient = getSupabaseUserClient(req);
    const clients = await ensureBaseWorkspace({ service, userClient, userId: user.id });
    const alex = clients.get('SAMPLE-001');
    const daniel = clients.get('SAMPLE-003');
    const alexSessions = await ensureThirdAlexSession({ service, userClient, userId: user.id, alexId: alex.id });
    if (alexSessions.length < 3) throw Object.assign(new Error('Sample Alex history could not be prepared.'), { status: 500, code: 'SAMPLE_HISTORY_INCOMPLETE' });

    const alexTranscripts = await ensureAlexTranscriptHistory({ service, userId: user.id, alex, sessions: alexSessions });
    const danielWorked = await ensureDanielWorkedExample({ service, userId: user.id, daniel });
    const inboxTranscript = await ensureSampleInboxTranscript({ service, userId: user.id });
    const sampleSummary = await ensureSampleSummaryDocument({ service, userId: user.id, alex, transcripts: alexTranscripts });

    return res.status(200).json({
      success: true,
      data: {
        clientsCreated: 4,
        transcriptInboxItems: 1,
        transcriptHistoryItems: alexTranscripts.length,
        reviewedSessionCaptures: alexTranscripts.length + 1,
        danielWorkedExampleReady: Boolean(danielWorked?.transcript?.id),
        longitudinalSummaryReady: true,
        sampleSummaryDocumentId: sampleSummary.id,
        inboxTranscriptId: inboxTranscript.id,
        startPath: '/transcripts'
      }
    });
  } catch (error) {
    console.error('[Sample Practice] Error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: {
        code: error.code || 'SAMPLE_PRACTICE_FAILED',
        message: status === 409 ? error.message : 'The sample practice could not be prepared. Try again.'
      }
    });
  }
}
