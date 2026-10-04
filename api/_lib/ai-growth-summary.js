export const GROWTH_SUMMARY_PROMPT_VERSION = 'growth-longitudinal-v1'
export const GROWTH_SUMMARY_MIN_REFLECTIONS = 3
export const GROWTH_SUMMARY_MAX_REFLECTIONS = 40
export const GROWTH_SUMMARY_MAX_TOTAL_CHARACTERS = 24000

export const growthSummarySystemPrompt = `You are supporting a psychotherapist's longitudinal reflective practice.

You will receive a chronological set of the therapist's own saved reflections. Some may contain a therapist-authored theme and/or a therapist-authored reflective map. Your job is to identify cautiously worded longitudinal observations that are useful for supervision and professional development.

Rules:
1. Ground every substantive observation in the supplied reflection records.
2. Never diagnose the therapist or clients.
3. Never infer competence, impairment, improvement, deterioration, ethics violations, motives, attachment style, personality, trauma history, or mental state as fact.
4. Frequency is not importance and change in frequency is not improvement or deterioration.
5. Distinguish clearly between:
   - repeated material: language/themes/positions that recur;
   - change over time: observable differences between earlier and later records;
   - tentative hypotheses: possible interpretations worth testing in supervision.
6. Prefer the therapist's own words and mapped fields over invented labels.
7. Do not quote client-identifying material. Avoid names and unnecessary case details.
8. Do not give treatment recommendations for clients.
9. Where evidence is weak or mixed, say so.
10. Each pattern or change must include evidence_refs containing the supplied reflection references (for example R3, R7).
11. Keep the result concise, specific and non-flattering.
12. The final section should provide supervision questions, not conclusions.

Return JSON only with:
- overview: 2-4 sentences describing the longitudinal picture and limits of the evidence.
- repeated_patterns: max 4 objects: { title, observation, evidence_refs }
- changes_over_time: max 4 objects: { title, observation, evidence_refs }
- emerging_capacities: max 3 objects: { title, observation, evidence_refs } Only include if directly evidenced by changed wording/behaviour in the therapist's own reflections; otherwise return [].
- supervision_questions: max 4 strings
- limitations: one short paragraph.
`

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function truncate(value, max) {
  const text = clean(value)
  return text.length <= max ? text : text.slice(0, max) + '…'
}

export function buildGrowthSummaryInput(reflections = []) {
  let usedCharacters = 0
  const records = []

  const ordered = [...reflections]
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .slice(-GROWTH_SUMMARY_MAX_REFLECTIONS)

  for (let index = 0; index < ordered.length; index += 1) {
    const reflection = ordered[index]
    const map = reflection?.workspace_content?.reflectiveMap
    const fields = []
    if (clean(reflection.theme)) fields.push(`Theme: ${truncate(reflection.theme, 120)}`)
    if (clean(reflection.body)) fields.push(`Reflection: ${truncate(reflection.body, 2200)}`)
    if (clean(reflection.supervision_question)) fields.push(`Supervision question: ${truncate(reflection.supervision_question, 500)}`)
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      if (clean(map.innerPosition)) fields.push(`Inner position: ${truncate(map.innerPosition, 300)}`)
      if (clean(map.protectiveIntention)) fields.push(`Protective intention: ${truncate(map.protectiveIntention, 500)}`)
      if (clean(map.trigger)) fields.push(`Trigger: ${truncate(map.trigger, 500)}`)
      if (clean(map.impact)) fields.push(`Impact: ${truncate(map.impact, 500)}`)
      if (clean(map.spaceCreated)) fields.push(`Space created: ${truncate(map.spaceCreated, 500)}`)
      if (clean(map.supervisionQuestion)) fields.push(`Mapped supervision question: ${truncate(map.supervisionQuestion, 500)}`)
    }

    if (!fields.length) continue
    const ref = `R${records.length + 1}`
    const date = reflection.created_at ? String(reflection.created_at).slice(0, 10) : 'date unavailable'
    const record = `${ref} | ${date}\n${fields.join('\n')}`
    if (usedCharacters + record.length > GROWTH_SUMMARY_MAX_TOTAL_CHARACTERS) break
    records.push(record)
    usedCharacters += record.length
  }

  return records.join('\n\n---\n\n')
}

function stringValue(value, max = 1000) {
  return truncate(String(value || ''), max)
}

function evidenceRefs(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item || '').trim().toUpperCase())
    .filter(item => /^R\d+$/.test(item))
    .slice(0, 8)
}

function normalizeItems(value, maxItems) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map(item => ({
    title: stringValue(item?.title, 140),
    observation: stringValue(item?.observation, 900),
    evidence_refs: evidenceRefs(item?.evidence_refs)
  })).filter(item => item.title && item.observation)
}

export function validateGrowthSummaryResponse(content) {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content
    if (!data || typeof data !== 'object') return null
    return {
      overview: stringValue(data.overview, 1600),
      repeated_patterns: normalizeItems(data.repeated_patterns, 4),
      changes_over_time: normalizeItems(data.changes_over_time, 4),
      emerging_capacities: normalizeItems(data.emerging_capacities, 3),
      supervision_questions: Array.isArray(data.supervision_questions)
        ? data.supervision_questions.slice(0, 4).map(item => stringValue(item, 600)).filter(Boolean)
        : [],
      limitations: stringValue(data.limitations, 1000)
    }
  } catch {
    return null
  }
}
