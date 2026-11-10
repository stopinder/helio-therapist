import { modalityStrategy } from './profiles/index.js';

export const string = { type: 'string' };
export const strings = { type: 'array', items: string };
export const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const list = items => ({ type: 'array', items });
export const enumeration = values => ({ type: 'string', enum: values });
export function responseFormat(name, schema) {
  return { type: 'json_schema', json_schema: { name, strict: true, schema } };
}
export function evidenceSchema(sourceIds) {
  const citation = object({ sourceId: enumeration(sourceIds), quote: string });
  return object({
    outcome: enumeration(['ready','needs_review']), reviewMessage: string, reviewEvidence: list(citation),
    observations: list(object({ id: string, text: string, citations: list(citation),
      kind: enumeration(['reported_experience','observed_event','therapist_observation','agreement','unresolved_question','method_instruction']) })),
    priorities: list(object({ observationIds: strings, importance: string })),
    gaps: strings
  });
}
export function formulationSchema(lens, evidenceIds) {
  const item = object({ text: string, evidenceIds: list(enumeration(evidenceIds)), status: enumeration(['supported','hypothesis','unknown']) });
  const profile = modalityStrategy(lens);
  return object({ fields: object(Object.fromEntries(Object.keys(profile.formulation).map(key => [key, list(item)]))), limitations: strings });
}
export function compositionSchema(lens, evidenceIds) {
  const claim = object({ text: string, evidenceIds: list(enumeration(evidenceIds)), status: enumeration(['observation','hypothesis']) });
  const section = object({ body: string, claims: list(claim) });
  const step = object({ number: { type: 'integer' }, instruction: string, evidenceIds: list(enumeration(evidenceIds)) });
  return object({
    sections: object(Object.fromEntries(Object.keys(modalityStrategy(lens).sections).map(key => [key, section]))),
    practice: object({ status: enumeration(['not_requested','ready','needs_clarification']), title: string,
      introduction: string, sequenceBasis: enumeration(['not_applicable','supplied_sequence','adaptation']),
      steps: list(step), checkInSteps: list(step), safety: string, clarification: string })
  });
}
// Validate provider output independently of the provider's strict schema. Errors contain codes only.
export function validateShape(value, schema, depth = 0) {
  if (depth > 12) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'string') return typeof value === 'string' && value.length <= 14000;
  if (schema.type === 'integer') return Number.isInteger(value);
  if (schema.type === 'array') return Array.isArray(value) && value.length <= 80 && value.every(item => validateShape(item, schema.items, depth + 1));
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length !== schema.required.length || !schema.required.every(key => Object.hasOwn(value, key))) return false;
    return keys.every(key => Object.hasOwn(schema.properties,key) && validateShape(value[key],schema.properties[key],depth + 1));
  }
  return false;
}
export function parseOutput(completion, schema) {
  const choice = completion?.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') throw failure('AI_RESPONSE_TRUNCATED', 'The clinical draft did not finish. Your existing work is unchanged.', 502);
  let parsed;
  try { parsed = JSON.parse(choice?.message?.content || ''); } catch { throw failure('INVALID_INTELLIGENCE_OUTPUT', 'The clinical draft could not be validated. Your existing work is unchanged.', 502); }
  if (!validateShape(parsed,schema)) throw failure('INVALID_INTELLIGENCE_OUTPUT', 'The clinical draft could not be validated. Your existing work is unchanged.', 502);
  return parsed;
}
export function failure(code, message, status = 422) { return Object.assign(new Error(message), { code, status }); }
const normalized = text => String(text).replace(/\s+/g,' ').trim();
export function verifyEvidence(value, sources, { allowEmpty = false, maxObservations = 32 } = {}) {
  const bySource = new Map(sources.map(source => [source.id, source]));
  if (bySource.size !== sources.length) throw failure('DUPLICATE_SOURCE_ID','The evidence contains ambiguous source identifiers. Your existing work is unchanged.');
  const verifyCitation = citation => {
    const source = bySource.get(citation.sourceId);
    return source && normalized(citation.quote).length >= 8 && normalized(source.text).includes(normalized(citation.quote));
  };
  if (!value.reviewEvidence.every(verifyCitation)) throw failure('UNVERIFIED_SOURCE_QUOTE', 'A supporting passage could not be verified. Your existing work is unchanged.');
  if (value.outcome === 'needs_review') {
    if (!value.reviewMessage.trim()) throw failure('INVALID_SOURCE_REVIEW','The source needs therapist review.');
    return value;
  }
  if (allowEmpty && !value.observations.length) {
    if (value.priorities.length || !value.gaps.some(gap=>gap.trim())) throw failure('EVIDENCE_MAP_INCOMPLETE','The evidence batch is incomplete. Your existing work is unchanged.');
    return value;
  }
  if (!value.observations.length || value.observations.length > maxObservations || !value.priorities.length || value.priorities.length > 3) throw failure('EVIDENCE_MAP_INCOMPLETE','The evidence map is incomplete. Your existing work is unchanged.');
  const ids = new Set();
  for (const observation of value.observations) {
    if (!/^e[1-9]\d{0,2}$/.test(observation.id) || ids.has(observation.id) || !observation.text.trim() || !observation.citations.length || !observation.citations.every(verifyCitation)) {
      throw failure('UNVERIFIED_SOURCE_QUOTE','A supporting passage could not be verified. Your existing work is unchanged.');
    }
    ids.add(observation.id);
    // Source rank and independence are derived here, never accepted from model labels.
    observation.citations = observation.citations.map(citation => ({...citation, sourceType:bySource.get(citation.sourceId).type, occurredAt:bySource.get(citation.sourceId).occurredAt || null, secondary:bySource.get(citation.sourceId).secondary === true}));
    observation.sourceIds = [...new Set(observation.citations.map(citation => citation.sourceId))];
    observation.encounterIds = [...new Set(observation.sourceIds.map(id => bySource.get(id).encounterId).filter(Boolean))];
    observation.secondaryOnly = observation.sourceIds.every(id => bySource.get(id).secondary === true);
  }
  if (!value.priorities.every(item => item.observationIds.length && item.observationIds.every(id => ids.has(id)))) throw failure('INVALID_EVIDENCE_REFERENCE','The clinical focus could not be linked to its evidence.');
  return value;
}
export function verifyFormulation(formulation, evidence, profile) {
  const ids = new Set(evidence.observations.map(observation => observation.id));
  let populated = 0;
  for (const key of Object.keys(profile.formulation)) for (const item of formulation.fields[key]) {
    if (!item.text.trim() || item.evidenceIds.some(id => !ids.has(id)) || (item.status !== 'unknown' && !item.evidenceIds.length)) {
      throw failure('INVALID_FORMULATION_REFERENCE','A formulation could not be linked to its evidence.');
    }
    if (item.status !== 'unknown') populated++;
  }
  if (!populated) throw failure('FORMULATION_INCOMPLETE','There is not enough supported material for this formulation.');
  return formulation;
}
function meaningfulSteps(steps, count = null) {
  return steps.length >= (count ?? 2) && (count === null || steps.length === count) && steps.every((step,index) => step.number === index + 1 && step.instruction.trim().split(/\s+/).length >= 5);
}
export function compositionIssues(document, evidence, requirements = {}) {
  const issues = [];
  const ids = new Set(evidence.observations.map(observation => observation.id));
  let count = 0;
  for (const section of Object.values(document.sections)) {
    if (!section.body.trim()) { if (section.claims.length) issues.push('CLAIM_WITHOUT_SECTION'); continue; }
    count++;
    if (!section.claims.length) issues.push('SECTION_WITHOUT_EVIDENCE');
    if (/https?:\/\/|www\./i.test(section.body)) issues.push('UNSELECTED_RESOURCE_LINK');
    const covered = section.claims.reduce((text, claim) => text.replace(claim.text,''), section.body).replace(/[\s\p{P}\p{S}]/gu,'');
    if (covered) issues.push('UNCITED_SENTENCE');
    for (const claim of section.claims) {
      if (!claim.text.trim() || !section.body.includes(claim.text) || !claim.evidenceIds.length || claim.evidenceIds.some(id => !ids.has(id))) issues.push('INVALID_CLAIM_REFERENCE');
      if (claim.evidenceIds.some(id => evidence.observations.find(item=>item.id===id)?.kind === 'method_instruction')) issues.push('METHOD_INSTRUCTION_IS_NOT_SESSION_EVENT');
      if (claim.status === 'hypothesis' && !/\b(?:may|might|could|perhaps|possible|tentative|wonder|wondered|question|uncertain)\b/i.test(claim.text)) issues.push('UNLABELLED_HYPOTHESIS');
    }
  }
  if (!count) issues.push('EMPTY_DOCUMENT');
  const practice = document.practice;
  if (!requirements.exercise) {
    if (practice.status !== 'not_requested' || practice.steps.length || practice.checkInSteps.length || practice.title.trim() || practice.introduction.trim() || practice.safety.trim()) issues.push('UNREQUESTED_ADDITION');
  } else {
    const points = requirements.eightPoint ? 8 : requirements.sixPoint ? 6 : null;
    if (practice.status !== 'ready' || !practice.title.trim() || !meaningfulSteps(practice.steps, points) || !/\b(?:stop|pause|decline|modify)\b/i.test(practice.safety)) issues.push('REQUESTED_EXERCISE_MISSING');
    if (requirements.somaticCheckIn && !meaningfulSteps(practice.checkInSteps)) issues.push('REQUESTED_SOMATIC_CHECKIN_MISSING');
    if (requirements.requiresSuppliedSequence && practice.sequenceBasis !== 'supplied_sequence') issues.push('SUPPLIED_SEQUENCE_REQUIRED');
    if (practice.sequenceBasis === 'supplied_sequence' && practice.steps.some(step => !step.evidenceIds.length)) issues.push('SEQUENCE_EVIDENCE_REQUIRED');
    if (practice.sequenceBasis === 'not_applicable') issues.push('SEQUENCE_BASIS_MISSING');
    for (const step of [...practice.steps,...practice.checkInSteps]) if (step.evidenceIds.some(id => !ids.has(id))) issues.push('INVALID_PRACTICE_REFERENCE');
    if (/https?:\/\/|www\./i.test(JSON.stringify(practice))) issues.push('UNSELECTED_RESOURCE_LINK');
  }
  return [...new Set(issues)];
}
export function renderModalityDocument(document, profile) {
  const parts = Object.entries(profile.sections).flatMap(([key, heading]) => document.sections[key].body.trim() ? [`${heading}\n\n${document.sections[key].body.trim()}`] : []);
  if (document.practice.status === 'ready') {
    const practice = document.practice;
    const basis = practice.sequenceBasis === 'adaptation' ? 'Adapted guidance for consideration, not a verified canonical sequence.' : 'Written guidance based on the supplied session material. Review before using it.';
    parts.push(`Optional exercise to consider\n\n${practice.title}\n\n${practice.introduction}\n\n${basis}\n\n${practice.steps.map(step => `${step.number}. ${step.instruction}`).join('\n\n')}\n\n${practice.safety}`);
    if (practice.checkInSteps.length) parts.push(`Somatic check-in\n\n${practice.checkInSteps.map(step => `${step.number}. ${step.instruction}`).join('\n\n')}`);
  }
  return parts.join('\n\n');
}
