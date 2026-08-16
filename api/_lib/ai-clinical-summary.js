export const CLINICAL_SUMMARY_PROMPT_VERSION = 'transcript-clinical-summary-v1';
export const CLINICAL_SUMMARY_MIN_INPUT_CHARACTERS = 100;
export const CLINICAL_SUMMARY_MAX_INPUT_CHARACTERS = 60000;

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

export function validateClinicalSummaryTranscript(text) {
  const transcript = String(text || '').trim();
  if (transcript.length < CLINICAL_SUMMARY_MIN_INPUT_CHARACTERS) {
    const error = new Error('The linked transcript is too short to prepare a clinical summary draft.');
    error.code = 'TRANSCRIPT_TOO_SHORT';
    error.status = 422;
    throw error;
  }
  if (transcript.length > CLINICAL_SUMMARY_MAX_INPUT_CHARACTERS) {
    const error = new Error('The linked transcript is too long for the current clinical summary draft workflow.');
    error.code = 'TRANSCRIPT_TOO_LONG';
    error.status = 422;
    throw error;
  }
  return transcript;
}

export function buildClinicalSummaryInput(transcript) {
  const text = validateClinicalSummaryTranscript(transcript);
  return `Prepare the editable draft from the source transcript below.\n\n<session_transcript>\n${text}\n</session_transcript>`;
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
