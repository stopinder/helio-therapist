export const SAMPLE_TRANSCRIPT_SOURCE = 'sample_zoom_my_notes';

export function isSampleClientReference(reference) {
  return typeof reference === 'string' && /^SAMPLE-\d{3}$/.test(reference);
}

export function isSampleTranscriptRow(transcript) {
  return Boolean(
    transcript &&
    transcript.source === SAMPLE_TRANSCRIPT_SOURCE &&
    typeof transcript.zoom_note_id === 'string' &&
    transcript.zoom_note_id.startsWith('SAMPLE-NOTE-')
  );
}

export function sampleCaptureDraftForTranscript(transcript) {
  const noteId = String(transcript?.zoom_note_id || '');
  if (!isSampleTranscriptRow(transcript)) return null;

  if (noteId === 'SAMPLE-NOTE-DANIEL-INBOX') {
    return {
      presentingConcerns: 'Daniel described anxiety and self-consciousness before social situations, with a tendency to predict rejection and leave interactions early when discomfort rises.',
      sessionThemes: 'The conversation focused on noticing predictions before social contact, distinguishing anxiety from evidence, and choosing a manageable next step rather than avoiding the situation entirely.',
      interventionsUsed: 'The therapist used collaborative questioning, normalisation and a graded behavioural-experiment frame to help Daniel identify one achievable social step.',
      clientResponse: 'Daniel recognised that leaving early reduces anxiety in the moment but prevents him learning whether the feared outcome would actually occur. He identified a brief coffee with a colleague as a realistic next experiment.',
      riskSafeguarding: '',
      progressGoals: 'Continue building confidence through small, observable social experiments and compare predictions with what actually happens.',
      planNextSession: 'Review the coffee experiment, what Daniel predicted beforehand, what happened, and what he noticed about the urge to leave.'
    };
  }

  if (noteId.includes('ALEX')) {
    return {
      presentingConcerns: 'Alex described work-related anxiety spilling into evenings, with rumination, repeated message checking and disrupted sleep.',
      sessionThemes: 'The session explored the link between perfectionistic standards, checking behaviour and difficulty disengaging from work.',
      interventionsUsed: 'The therapist used collaborative formulation, behavioural observation and a small experiment around stopping work-message checking at an agreed time.',
      clientResponse: 'Alex reported that evenings were calmer when the stopping time was maintained and was willing to test a more flexible standard on a low-stakes task.',
      riskSafeguarding: '',
      progressGoals: 'Reduce evening checking, protect sleep and practise tolerating good-enough completion on lower-stakes work.',
      planNextSession: 'Review what happened on evenings without checking and whether flexible standards changed anxiety or task completion.'
    };
  }

  return {
    presentingConcerns: 'This is synthetic sample material created to demonstrate Helios Session Capture.',
    sessionThemes: 'The sample conversation demonstrates how transcript-grounded material can be organised for therapist review.',
    interventionsUsed: 'Collaborative exploration and clarification are represented in this synthetic example.',
    clientResponse: 'The fictional client engaged with the discussion and identified a next step.',
    riskSafeguarding: '',
    progressGoals: 'Continue the agreed sample next step and review what changes.',
    planNextSession: 'Review the agreed sample action and any new observations.'
  };
}

function alexSections(lens, count) {
  const longitudinal = count > 1;
  const perspective = {
    general: 'Across the available sessions, the useful thread is the relationship between work pressure, checking and Alex’s ability to disengage in the evening.',
    integrative: 'An integrative reading keeps both the practical checking cycle and the emotional meaning of high standards in view, without reducing the work to one model.',
    gentle_cbt: 'From a CBT perspective, the evidence supports a maintenance loop in which work-related worry prompts checking, checking briefly reduces uncertainty, and repeated checking makes it harder to disengage.',
    internal_family_systems: 'From an IFS perspective, Alex’s language can be held as different inner positions around responsibility and stopping work; the sample does not establish fixed parts or origins.',
    transactional_analysis: 'From a Transactional Analysis perspective, the material suggests moments where demanding internal standards compete with a more flexible Adult assessment of what is actually required.'
  }[lens] || '';
  return {
    opening: 'Recent work has centred on work-related anxiety, evening rumination and protecting sleep while maintaining realistic standards.',
    whatWeWorkedOn: 'Alex reviewed late-night message checking, the pressure to complete work perfectly, and practical ways of creating a clearer stopping point at the end of the working day.',
    patternsOverTime: longitudinal ? 'Across more than one session, work pressure has repeatedly been followed by checking and difficulty switching off in the evening. The material also shows that the pattern is less pronounced when Alex uses a deliberate wind-down routine and a clear stopping time.' : '',
    changesAndExceptions: longitudinal ? 'Alex has reported fewer late-night checks and somewhat easier sleep on evenings when the wind-down routine is used. A more flexible standard on lower-stakes work has also been introduced as an experiment rather than assumed to be a permanent change.' : 'The current session records a willingness to test a clearer stopping point and a more flexible standard on one lower-stakes task.',
    strengthsAndResources: 'Alex is able to observe the checking cycle, test small behavioural changes and compare what happens rather than relying only on anxious predictions.',
    perspectiveReflection: perspective,
    betweenSession: 'Continue the evening stopping-time experiment, use the wind-down routine, and notice what happens when one lower-stakes task is completed to a good-enough standard.',
    closing: 'The next useful question is whether reduced checking and more flexible standards continue to make disengaging from work easier.'
  };
}

function priyaSections(lens, count) {
  return {
    opening: 'The available sample material focuses on bereavement, adjustment and staying connected with supportive relationships.',
    whatWeWorkedOn: 'Priya explored the pressure to appear recovered, the uneven quality of grief, and one manageable reconnection with a trusted friend.',
    patternsOverTime: count > 1 ? 'Across the available material, grief is described as variable rather than linear, with difficult periods becoming more noticeable around reminders and milestones.' : '',
    changesAndExceptions: 'The material identifies supportive connection as something Priya can approach gently rather than as evidence that grief should already have resolved.',
    strengthsAndResources: 'Priya can name changes in emotional intensity and identify trusted people who feel safe enough for gradual reconnection.',
    perspectiveReflection: lens === 'general' ? 'The sample summary keeps grief variability and social support in view without treating either as a diagnosis or a fixed trajectory.' : 'The selected perspective is applied only to the synthetic evidence and does not add a diagnosis or causal explanation.',
    betweenSession: 'Make one gentle reconnection with a trusted friend and notice what feels supportive or too much.',
    closing: 'Continue making room for grief to vary while tracking which forms of connection feel supportive.'
  };
}

function danielSections(lens, count) {
  return {
    opening: 'The sample material focuses on confidence in social situations and the pull to avoid or leave when anxiety rises.',
    whatWeWorkedOn: 'Daniel identified anxious predictions before social contact and planned a small behavioural experiment that would be manageable enough to complete.',
    patternsOverTime: count > 1 ? 'Across the available sample material, anticipatory anxiety and early withdrawal recur together.' : '',
    changesAndExceptions: 'Daniel is beginning to compare feared outcomes with what actually happens rather than treating the prediction as certainty.',
    strengthsAndResources: 'Daniel can identify manageable steps and is willing to test predictions in real situations.',
    perspectiveReflection: lens === 'gentle_cbt' ? 'The CBT frame highlights prediction, avoidance and new learning through graded behavioural experiments.' : 'The selected perspective is kept tentative and grounded in the synthetic sample material.',
    betweenSession: 'Complete the agreed social experiment and record the prediction, what happened and the urge to leave.',
    closing: 'Review what the experiment taught Daniel about anxiety, prediction and staying in the interaction.'
  };
}

export function buildSampleClientSummary({ reference, lens = 'general', selectedCaptures = [] } = {}) {
  if (!isSampleClientReference(reference) || !selectedCaptures.length) return null;
  const count = selectedCaptures.length;
  const sections = reference === 'SAMPLE-001'
    ? alexSections(lens, count)
    : reference === 'SAMPLE-002'
      ? priyaSections(lens, count)
      : danielSections(lens, count);

  const sourceIds = selectedCaptures.map(c => `session:${c.sessionId || c.session_id}`).filter(Boolean);
  const claims = [];
  if (sections.whatWeWorkedOn && sourceIds[0]) {
    claims.push({ section: 'whatWeWorkedOn', text: sections.whatWeWorkedOn, sourceIds: [sourceIds[0]], evidenceStrength: 'current_observation' });
  }
  if (sections.patternsOverTime && sourceIds.length >= 2) {
    claims.push({ section: 'patternsOverTime', text: sections.patternsOverTime, sourceIds: sourceIds.slice(0, Math.min(3, sourceIds.length)), evidenceStrength: 'recurring' });
  }
  if (sections.changesAndExceptions && sourceIds[0]) {
    claims.push({ section: 'changesAndExceptions', text: sections.changesAndExceptions, sourceIds: sourceIds.slice(0, Math.min(2, sourceIds.length)), evidenceStrength: sourceIds.length >= 2 ? 'explicit_change' : 'current_observation' });
  }
  if (sections.strengthsAndResources && sourceIds[0]) {
    claims.push({ section: 'strengthsAndResources', text: sections.strengthsAndResources, sourceIds: [sourceIds[0]], evidenceStrength: 'current_observation' });
  }
  return { sections, claims };
}

export function sampleStructuredTranscript({ therapist = 'Therapist', client = 'Client', turns = [] } = {}) {
  const speakers = [
    { speaker_id: '1', display_name: therapist },
    { speaker_id: '2', display_name: client }
  ];
  const items = turns.map((turn, index) => ({
    speaker_id: turn.speaker === 'therapist' ? '1' : '2',
    start_time: `00:${String(Math.floor(index / 6)).padStart(2, '0')}:${String((index * 10) % 60).padStart(2, '0')}.000`,
    text: turn.text
  }));
  return { speakers, items };
}

export function canonicalSampleTranscript(structured) {
  const names = new Map((structured?.speakers || []).map(s => [String(s.speaker_id), s.display_name]));
  return (structured?.items || []).map(item => `[${item.start_time}] ${names.get(String(item.speaker_id)) || 'Unknown'}: ${item.text}`).join('\n');
}
