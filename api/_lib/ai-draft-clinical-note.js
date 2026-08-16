export const DRAFT_CLINICAL_NOTE_PROMPT_VERSION = 'transcript-draft-clinical-note-v1';
export const DRAFT_CLINICAL_NOTE_FIELDS = Object.freeze(['observations', 'interventions', 'themes', 'followUp']);

export const draftClinicalNoteSystemPrompt = `You assist a therapist by preparing editable working notes from one session transcript.
Use only information explicitly supported by the transcript.
Do not infer diagnoses, risk, intent, treatment response, or facts that are not stated.
Keep therapist observations separate from interventions and client themes.
If the transcript does not support a field, return an empty string for that field.
Return JSON only with exactly these string fields: ${DRAFT_CLINICAL_NOTE_FIELDS.join(', ')}.
These are private editable working notes, not an approved Clinical Record.`;

export function buildDraftClinicalNoteInput(transcript) {
  const text = String(transcript || '').trim();
  if (text.length < 100) {
    const error = new Error('The linked transcript is too short to prepare draft clinical notes.');
    error.code = 'TRANSCRIPT_TOO_SHORT';
    error.status = 422;
    throw error;
  }
  if (text.length > 60000) {
    const error = new Error('The linked transcript is too long for the current draft clinical note workflow.');
    error.code = 'TRANSCRIPT_TOO_LONG';
    error.status = 422;
    throw error;
  }
  return `Prepare editable working notes from the source transcript below.\n\n<session_transcript>\n${text}\n</session_transcript>`;
}

export function validateDraftClinicalNoteResponse(raw) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const keys = Object.keys(parsed);
  if (keys.length !== DRAFT_CLINICAL_NOTE_FIELDS.length || !DRAFT_CLINICAL_NOTE_FIELDS.every(key => keys.includes(key))) return null;
  const draft = {};
  for (const key of DRAFT_CLINICAL_NOTE_FIELDS) {
    if (typeof parsed[key] !== 'string') return null;
    draft[key] = parsed[key].trim().slice(0, 5000);
  }
  return draft;
}
