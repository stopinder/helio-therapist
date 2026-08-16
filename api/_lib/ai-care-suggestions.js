export const CARE_SUGGESTIONS_PROMPT_VERSION = 'care-suggestions-v4';
export const TRANSCRIPT_CBT_CARE_PROMPT_VERSION = 'transcript-cbt-care-v1';

const BASIS = new Set(['therapist_input', 'approved_record', 'both', 'session_transcript']);
const EPISTEMIC = new Set(['observation', 'clinical_inference', 'possible_next_step']);

export function buildCareSuggestionsPrompt({ lensConfig, input, steering, currentCare = [], approvedContext = '' }) {
  const careContext = currentCare
    .filter(item => lensConfig.allowedKinds.includes(item?.kind) && item?.id && item?.body)
    .map(item => `Care item ${item.id} [${item.kind}]: ${String(item.body).slice(0, 1200)}`)
    .join('\n');

  return `${lensConfig.aiFraming} Generate 3-6 discrete possibilities for clinician review. Never diagnose, assert certainty, or imply a suggestion is established fact. Distinguish evidence from clinical inference. Use only the therapist input, approved context, and current clinician-approved Care items supplied below. Suggestions may either ADD a new Care item or UPDATE an existing one when new material meaningfully changes, refines, contradicts, or supersedes it. Never update for cosmetic wording alone. Return JSON only: {"suggestions":[{"kind":"...","body":"...","basis":"therapist_input|approved_record|both","epistemic":"observation|clinical_inference|possible_next_step","action":"add|update","targetItemId":null|string,"reason":"short explanation"}]}. Allowed kinds: ${lensConfig.allowedKinds.join(', ')}.\nTherapist input: ${input}\nOptional steering: ${steering || 'none'}\nCurrent clinician-approved Care:\n${careContext || 'none'}\nApproved record context:\n${approvedContext || 'none'}`;
}

export function buildTranscriptCbtCarePrompt({ transcript, currentCare = [], lensConfig }) {
  const text = String(transcript || '').trim();
  if (text.length < 100) {
    const error = new Error('The linked transcript is too short to prepare CBT Care suggestions.');
    error.code = 'TRANSCRIPT_TOO_SHORT';
    error.status = 422;
    throw error;
  }
  if (text.length > 60000) {
    const error = new Error('The linked transcript is too long for the current CBT Care workflow.');
    error.code = 'TRANSCRIPT_TOO_LONG';
    error.status = 422;
    throw error;
  }

  const careContext = currentCare
    .filter(item => lensConfig.allowedKinds.includes(item?.kind) && item?.id && item?.body)
    .map(item => `Care item ${item.id} [${item.kind}]: ${String(item.body).slice(0, 1200)}`)
    .join('\n');

  return `${lensConfig.aiFraming} Review one session transcript and generate 3-6 tentative Care possibilities for a qualified therapist to review. Use only the transcript and current clinician-approved Care supplied below. Do not diagnose. Do not infer risk, intent, history, beliefs, or treatment response beyond what the transcript supports. Clearly distinguish direct observations from clinical inference and possible next steps. Suggestions may ADD a new Care item or UPDATE an existing one only when the transcript meaningfully changes, refines, contradicts, or supersedes it. Never update for cosmetic wording alone. Return JSON only: {"suggestions":[{"kind":"...","body":"...","basis":"session_transcript","epistemic":"observation|clinical_inference|possible_next_step","action":"add|update","targetItemId":null|string,"reason":"short explanation"}]}. Allowed kinds: ${lensConfig.allowedKinds.join(', ')}.\nCurrent clinician-approved Care:\n${careContext || 'none'}\n\n<session_transcript>\n${text}\n</session_transcript>`;
}

export function validateCareSuggestions(raw, { allowedKinds, validCareIds = new Set(), promptVersion, defaultBasis = 'therapist_input' }) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!parsed || !Array.isArray(parsed.suggestions)) return null;

  const suggestions = parsed.suggestions
    .filter(item => allowedKinds.includes(item?.kind) && String(item?.body || '').trim())
    .slice(0, 6)
    .map((item, index) => {
      const wantsUpdate = item.action === 'update' && validCareIds.has(item.targetItemId);
      return {
        id: `suggestion-${Date.now()}-${index}`,
        kind: item.kind,
        body: String(item.body).trim().slice(0, 5000),
        basis: BASIS.has(item.basis) ? item.basis : defaultBasis,
        epistemic: EPISTEMIC.has(item.epistemic) ? item.epistemic : 'clinical_inference',
        action: wantsUpdate ? 'update' : 'add',
        targetItemId: wantsUpdate ? item.targetItemId : null,
        reason: String(item.reason || '').trim().slice(0, 500),
        promptVersion
      };
    });

  return suggestions;
}
