export const CARE_SUGGESTIONS_PROMPT_VERSION = 'therapy-focus-suggestions-v1';
export const TRANSCRIPT_CBT_CARE_PROMPT_VERSION = 'transcript-cbt-therapy-focus-v1';

const BASIS = new Set(['therapist_input', 'approved_record', 'both', 'session_transcript', 'clinical_history']);
const EPISTEMIC = new Set(['observation', 'clinical_inference', 'possible_next_step']);
const EVIDENCE_STRENGTHS = new Set(['current_observation', 'recurring', 'explicit_change', 'tentative_connection']);

export function buildCareSuggestionsPrompt({
  lensConfig,
  input = '',
  steering = '',
  currentCare = [],
  approvedContext = '',
  sourceMode = 'reflection',
  reviewGoal = 'review_updates',
  window = 'last_three',
  historySources = []
}) {
  const focusContext = currentCare
    .filter(item => lensConfig.allowedKinds.includes(item?.kind) && item?.id && item?.body)
    .map(item => `Therapy Focus item ${item.id} [${item.kind}]: ${String(item.body).slice(0, 1200)}`)
    .join('\n');

  const historyContext = historySources.length
    ? historySources.map(source => `${source.id} | ${source.occurredAt || 'date unavailable'} | ${source.sourceType}: ${JSON.stringify(source.content || {}).slice(0, 9000)}`).join('\n')
    : approvedContext;

  const modeInstruction = sourceMode === 'history'
    ? `Review the selected clinical history and current therapist-approved Therapy Focus. The review goal is ${reviewGoal === 'fill_empty' ? 'to propose useful material for empty sections while avoiding duplication' : 'to identify meaningful additions or updates where the working view has evolved'}. The evidence window is ${window}. Every suggestion must cite one or more supplied session source IDs in sourceIds. Use evidenceStrength=recurring only when substantially similar evidence appears in at least two supplied session sources; one-session evidence is current_observation. Change requires explicit comparative evidence; silence is not improvement.`
    : 'Use the therapist-authored reflection and approved record context to suggest possible additions or meaningful updates.';

  return `${lensConfig.aiFraming} Generate 3-6 discrete Therapy Focus possibilities for a qualified psychotherapist to review. Never diagnose, assert certainty, or imply a suggestion is established fact. Distinguish direct observation from clinical inference and possible next steps. ${modeInstruction} Suggestions may ADD a new Therapy Focus item or UPDATE an existing one only when the material meaningfully changes, refines, contradicts or supersedes it. Never update for cosmetic wording alone. Return JSON only: {"suggestions":[{"kind":"...","body":"...","basis":"therapist_input|approved_record|both|clinical_history","epistemic":"observation|clinical_inference|possible_next_step","action":"add|update","targetItemId":null|string,"reason":"short explanation","sourceIds":[],"evidenceStrength":"current_observation|recurring|explicit_change|tentative_connection"}]}. Allowed kinds: ${lensConfig.allowedKinds.join(', ')}.\nTherapist input: ${input || 'none'}\nOptional steering: ${steering || 'none'}\nCurrent therapist-approved Therapy Focus:\n${focusContext || 'none'}\nSelected clinical evidence:\n${historyContext || 'none'}`;
}

export function buildTranscriptCbtCarePrompt({ transcript, currentCare = [], lensConfig }) {
  const text = String(transcript || '').trim();
  if (text.length < 100) {
    const error = new Error('The linked transcript is too short to prepare CBT Therapy Focus suggestions.');
    error.code = 'TRANSCRIPT_TOO_SHORT';
    error.status = 422;
    throw error;
  }
  if (text.length > 60000) {
    const error = new Error('The linked transcript is too long for the current CBT Therapy Focus workflow.');
    error.code = 'TRANSCRIPT_TOO_LONG';
    error.status = 422;
    throw error;
  }

  const careContext = currentCare
    .filter(item => lensConfig.allowedKinds.includes(item?.kind) && item?.id && item?.body)
    .map(item => `Therapy Focus item ${item.id} [${item.kind}]: ${String(item.body).slice(0, 1200)}`)
    .join('\n');

  return `${lensConfig.aiFraming} Review one session transcript and generate 3-6 tentative Therapy Focus possibilities for a qualified therapist to review. Use only the transcript and current therapist-approved Therapy Focus supplied below. Do not diagnose. Do not infer risk, intent, history, beliefs, or treatment response beyond what the transcript supports. Clearly distinguish direct observations from clinical inference and possible next steps. Suggestions may ADD a new Therapy Focus item or UPDATE an existing one only when the transcript meaningfully changes, refines, contradicts, or supersedes it. Never update for cosmetic wording alone. Return JSON only: {"suggestions":[{"kind":"...","body":"...","basis":"session_transcript","epistemic":"observation|clinical_inference|possible_next_step","action":"add|update","targetItemId":null|string,"reason":"short explanation"}]}. Allowed kinds: ${lensConfig.allowedKinds.join(', ')}.\nCurrent therapist-approved Therapy Focus:\n${careContext || 'none'}\n\n<session_transcript>\n${text}\n</session_transcript>`;
}

export function validateCareSuggestions(raw, {
  allowedKinds,
  validCareIds = new Set(),
  validSourceIds = null,
  promptVersion,
  defaultBasis = 'therapist_input'
}) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!parsed || !Array.isArray(parsed.suggestions)) return null;

  const suggestions = parsed.suggestions
    .filter(item => allowedKinds.includes(item?.kind) && String(item?.body || '').trim())
    .slice(0, 6)
    .map((item, index) => {
      const wantsUpdate = item.action === 'update' && validCareIds.has(item.targetItemId);
      const sourceIds = [...new Set(
        (Array.isArray(item.sourceIds) ? item.sourceIds : [])
          .filter(id => typeof id === 'string' && (!validSourceIds || validSourceIds.has(id)))
      )];
      let evidenceStrength = EVIDENCE_STRENGTHS.has(item.evidenceStrength) ? item.evidenceStrength : null;
      const sessionSourceCount = sourceIds.filter(id => id.startsWith('session:')).length;
      if (evidenceStrength === 'recurring' && sessionSourceCount < 2) evidenceStrength = sessionSourceCount === 1 ? 'current_observation' : null;
      return {
        id: `suggestion-${Date.now()}-${index}`,
        kind: item.kind,
        body: String(item.body).trim().slice(0, 5000),
        basis: BASIS.has(item.basis) ? item.basis : defaultBasis,
        epistemic: EPISTEMIC.has(item.epistemic) ? item.epistemic : 'clinical_inference',
        action: wantsUpdate ? 'update' : 'add',
        targetItemId: wantsUpdate ? item.targetItemId : null,
        reason: String(item.reason || '').trim().slice(0, 500),
        sourceIds,
        evidenceStrength,
        promptVersion
      };
    });

  return suggestions;
}
