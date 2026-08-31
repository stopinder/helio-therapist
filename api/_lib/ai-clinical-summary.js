export const CLINICAL_SUMMARY_PROMPT_VERSION = 'transcript-session-capture-v2';
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

export const clinicalSummarySystemPrompt = `You assist a therapist by preparing an editable clinical-summary draft from one session transcript.
Use only information explicitly supported by the transcript.
Do not infer diagnoses, risk, intent, treatment response, or facts that are not stated.
If the transcript does not support a field, return an empty string for that field.
Use concise, neutral clinical language and distinguish therapist actions from client statements.
Return JSON only with exactly these string fields: ${CLINICAL_SUMMARY_FIELDS.join(', ')}.
This is a draft for therapist review, not an approved clinical record.`;

export const clinicalSummaryMergeSystemPrompt = `You combine partial session-capture drafts prepared from consecutive parts of one session transcript.
Use only information present in the partial drafts.
Remove duplication while preserving clinically relevant distinctions and chronology.
Do not infer diagnoses, risk, intent, treatment response, or facts that are not stated.
If the partial drafts do not support a field, return an empty string for that field.
Return JSON only with exactly these string fields: ${CLINICAL_SUMMARY_FIELDS.join(', ')}.
This is editable working material for therapist review, not an approved clinical record.`;

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

export function buildClinicalSummaryInput(transcript) {
  const text = validateClinicalSummaryTranscript(transcript);
  return `Prepare the editable draft from the source transcript below.\n\n<session_transcript>\n${text}\n</session_transcript>`;
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
  return `Combine these consecutive partial captures into one editable session capture.\n\n<partial_captures>\n${JSON.stringify(drafts)}\n</partial_captures>`;
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
