export const CLINICAL_SUMMARY_PROMPT_VERSION = 'transcript-session-capture-v4';
export const CLINICAL_SUMMARY_MIN_INPUT_CHARACTERS = 100;
export const CLINICAL_SUMMARY_CHUNK_CHARACTERS = 45000;

export const CLINICAL_SUMMARY_FIELDS = Object.freeze([
  'presentingConcerns',
  'sessionThemes',
  'interventionsUsed',
  'clientResponse',
  'riskSafeguarding',
  'progressGoals',
  'planNextSession'
]);

export const clinicalSummarySystemPrompt = `You assist a therapist by preparing concise, editable Session Capture working material from one therapy-session transcript.
The transcript is the factual boundary. Keep every field transcript-grounded unless therapist guidance clearly supplies a therapist observation or correction, and label that material as therapist-provided rather than transcript-spoken.
Do not infer diagnoses, risk, intent, treatment response, motivation, causation, or other unsupported clinical conclusions.
Distinguish client report from therapist action. Preserve chronology when it helps explain change, sequence, or an agreed plan.
Prefer specific session-relevant synthesis over repetitive paraphrase or vague generic clinical language. Avoid repeating the same point across multiple fields.
If evidence is insufficient for a field, return an empty string rather than filling the gap.
Field guidance:
- presentingConcerns: specific difficulties reported by the client, with stated context, change over time, or impact where supported; do not infer causes.
- sessionThemes: central topics, patterns, questions, or events discussed; synthesise rather than repeat presentingConcerns.
- interventionsUsed: therapist actions or techniques evident in the source; do not assign a named modality unless supported.
- clientResponse: only stated or observable responses evident in the source; do not infer benefit, engagement, improvement, or treatment response.
- riskSafeguarding: only explicit disclosures, assessments, decisions, or safeguarding actions; if risk is mentioned but incompletely assessed, state the uncertainty; never convert absence of discussion into “no risk”.
- progressGoals: explicitly reported change, obstacles, and stated or agreed goals; distinguish client-reported progress from therapist evaluation.
- planNextSession: only explicit agreements, intended follow-up, or planned practice; do not invent recommendations or future interventions.
Return JSON only with exactly these string fields: ${CLINICAL_SUMMARY_FIELDS.join(', ')}.
This is editable working material for therapist review, not an approved Clinical Record.`;

export const clinicalSummaryMergeSystemPrompt = `You combine partial Session Capture drafts prepared from consecutive parts of one session transcript.
Use only information present in the partial drafts.
Remove duplication while preserving clinically relevant distinctions and useful chronology.
Distinguish client report from therapist action.
Do not infer diagnoses, risk, intent, treatment response, or facts that are not stated.
If the partial drafts do not support a field, return an empty string for that field.
Return JSON only with exactly these string fields: ${CLINICAL_SUMMARY_FIELDS.join(', ')}.
This is editable working material for therapist review, not an approved Clinical Record.`;

export function validateClinicalSummaryTranscript(text) {
  const transcript = String(text || '').trim();
  if (transcript.length < CLINICAL_SUMMARY_MIN_INPUT_CHARACTERS) {
    const error = new Error('The linked transcript is too short to prepare a clinical summary draft.');
    error.code = 'TRANSCRIPT_TOO_SHORT';
    error.status = 422;
    throw error;
  }
  return transcript;
}

export function buildClinicalSummaryInput(transcript, { therapistGuidance = '', currentDraft = null, dismissedFields = [] } = {}) {
  const text = validateClinicalSummaryTranscript(transcript);
  const guidance = String(therapistGuidance || '').trim().slice(0, 20000);
  const draft = currentDraft && typeof currentDraft === 'object' ? validateClinicalSummaryResponse(currentDraft) : null;
  const dismissed = dismissedFields.filter(key => CLINICAL_SUMMARY_FIELDS.includes(key));

  const regenerationInstructions = draft || guidance
    ? `This is a regeneration pass. Apply this authority order:
1. The transcript is the factual boundary.
2. Therapist guidance has authority over corrections, emphasis, organisation, scope, and requested revisions when compatible with the available evidence. Materially revise the relevant sections when the guidance asks for a change; do not merely preserve or lightly restate the current wording.
3. The current draft is secondary reusable source material. Preserve useful existing wording only when it does not conflict with transcript evidence or therapist guidance. Keep unrelated, well-supported sections stable rather than rewriting them at random.
Therapist-provided observations may be included as therapist observations, but never present them as something said in the transcript.
Do not invent facts or infer diagnoses, risk, intent, treatment response, or unsupported clinical conclusions.
This remains editable Session Capture working material, not an approved Clinical Record.`
    : '';

  return `Prepare the editable draft from the source transcript below.
${regenerationInstructions}
${draft ? `<current_working_draft>\n${JSON.stringify(draft)}\n</current_working_draft>` : ''}
${guidance ? `<therapist_guidance>\n${guidance}\n</therapist_guidance>` : ''}
${dismissed.length ? `The therapist removed these sections for this review cycle. Return an empty string for them: ${dismissed.join(', ')}.` : ''}
<session_transcript>
${text}
</session_transcript>`;
}

export function applySpeakerIdentities(transcript, speakerIdentities = {}) {
  let text = String(transcript || '');
  for (const [sourceLabel, identity] of Object.entries(speakerIdentities)) {
    const label = String(sourceLabel || '').trim();
    const role = String(identity || '').trim();
    if (!label || !role) continue;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`^(\\s*(?:\\[[^\\]]+\\]\\s*)?)${escaped}:`, 'gmi'), `$1${role}:`);
  }
  return text;
}

export function splitClinicalSummaryTranscript(transcript, maxCharacters = CLINICAL_SUMMARY_CHUNK_CHARACTERS) {
  const text = validateClinicalSummaryTranscript(transcript);
  if (text.length <= maxCharacters) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxCharacters) {
    let splitAt = remaining.lastIndexOf('\n\n', maxCharacters);
    if (splitAt < Math.floor(maxCharacters * 0.6)) splitAt = remaining.lastIndexOf('\n', maxCharacters);
    if (splitAt < Math.floor(maxCharacters * 0.6)) splitAt = maxCharacters;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function buildClinicalSummaryMergeInput(drafts) {
  return `Combine these consecutive partial captures into one editable Session Capture.\n\n<partial_captures>\n${JSON.stringify(drafts)}\n</partial_captures>`;
}

export function validateClinicalSummaryResponse(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const keys = Object.keys(parsed);
  if (keys.length !== CLINICAL_SUMMARY_FIELDS.length || !CLINICAL_SUMMARY_FIELDS.every(key => keys.includes(key))) return null;

  const draft = {};
  for (const key of CLINICAL_SUMMARY_FIELDS) {
    if (typeof parsed[key] !== 'string') return null;
    draft[key] = parsed[key].trim().slice(0, 5000);
  }
  return draft;
}
