export const ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION = 'ask-helios-reflection-draft-v1';

const REFLECTION_KEYS = ['stoodOut','emotionalResponse','countertransference','uncertainties','supervisionQuestions','nextSession'];
const MAP_KEYS = ['innerPosition','protectiveIntention','trigger','impact','spaceCreated','supervisionQuestion'];

function clean(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export const askHeliosReflectionDraftSystemPrompt = `You turn an Ask Helios conversation into a provisional therapist reflection draft for explicit human review.

Use only FIRST-PERSON therapist material from user messages as evidence for reflective claims.
Assistant messages may help you understand the conversational context, but they are NOT evidence about the therapist.
Never infer a therapist "part", inner position, motive, protective intention, countertransference, attachment style, diagnosis, competence, trauma history, or personality from client material or from your own prior suggestions.
Do not repeat client names, identifying details, diagnoses, demographics, or specific client facts into the draft.
If a field is not clearly supported by therapist-authored first-person material, return an empty string for that field.
Mapping is optional. It is better to leave a mapping field blank than to invent one.
Keep wording tentative where interpretation is involved.
Do not write as if a client said something unless the therapist explicitly reflected on their own response to it.

Return JSON only:
{
  "theme": "optional short therapist-reviewable theme or empty string",
  "reflection": {
    "stoodOut": "",
    "emotionalResponse": "",
    "countertransference": "",
    "uncertainties": "",
    "supervisionQuestions": "",
    "nextSession": ""
  },
  "reflectiveMap": {
    "innerPosition": "",
    "protectiveIntention": "",
    "trigger": "",
    "impact": "",
    "spaceCreated": "",
    "supervisionQuestion": ""
  },
  "limitations": "brief note about what was not supported strongly enough to map"
}`;

export function buildAskHeliosReflectionDraftInput(messages = []) {
  return messages.map((message, index) => {
    const role = message?.role === 'assistant' ? 'ASSISTANT' : 'THERAPIST';
    const content = clean(message?.content, 1800);
    return content ? `${role} ${index + 1}: ${content}` : '';
  }).filter(Boolean).join('\n\n');
}

export function validateAskHeliosReflectionDraft(raw) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const reflection = {};
  const reflectiveMap = {};
  for (const key of REFLECTION_KEYS) reflection[key] = clean(parsed.reflection?.[key], 1400);
  for (const key of MAP_KEYS) reflectiveMap[key] = clean(parsed.reflectiveMap?.[key], 1000);
  const theme = clean(parsed.theme, 120);
  const limitations = clean(parsed.limitations, 700);
  if (![theme, ...Object.values(reflection), ...Object.values(reflectiveMap)].some(Boolean)) return null;
  return { theme, reflection, reflectiveMap, limitations };
}

export const ASK_HELIOS_REFLECTION_KEYS = Object.freeze([...REFLECTION_KEYS]);
export const ASK_HELIOS_MAP_KEYS = Object.freeze([...MAP_KEYS]);
