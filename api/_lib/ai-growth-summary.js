export const GROWTH_SUMMARY_PROMPT_VERSION = 'growth-longitudinal-v2'
export const GROWTH_SUMMARY_MIN_REFLECTIONS = 2
export const GROWTH_SUMMARY_MAX_REFLECTIONS = 40
export const GROWTH_SUMMARY_MAX_TOTAL_CHARACTERS = 24000

export const growthSummarySystemPrompt = `You are producing a developmental synthesis for a psychotherapist from their own longitudinal reflective writing.

This is NOT a summarisation task. Do not walk through records one by one. Do not tell the therapist what each reflection says. Your value is in comparing records across time and identifying relationships between them.

Before answering, silently:
- separate direct practice reflections from generic, questionnaire, instructional, template or fictional material;
- identify recurring tensions, responses, assumptions or therapist positions across multiple records;
- compare earlier and later examples of the same thread;
- look for changes in recognition, timing, flexibility, response, uncertainty, language or use of supervision;
- notice contradictions: what the therapist says they value versus what they describe doing, or two competing pulls that recur;
- ask what the pattern may mean for the therapist's practice, without turning a hypothesis into fact.

A useful synthesis sounds like:
"Across several entries, there is a repeated tension between wanting to leave space and feeling pulled to organise the session. Earlier reflections describe noticing this after the fact; later material shows the pull being recognised in the room. That may indicate a shift from retrospective awareness toward earlier recognition, though the evidence is still limited."

An UNHELPFUL response sounds like:
"R1 says you talked too much. R4 says you wanted to fill silence. R8 says you organised the session."
Do not produce that kind of paraphrase.

Rules:
1. Ground every substantive claim in supplied evidence.
2. Never diagnose the therapist or client.
3. Never infer competence, impairment, improvement, deterioration, ethics violations, motives, attachment style, personality or trauma history as fact.
4. Frequency is not importance. Reduced frequency is not improvement.
5. Use direct practice material as primary evidence. Questionnaire, generic, instructional, fictional or AI-authored material must not drive a developmental conclusion.
6. A thread should usually connect at least two records. If it cannot, omit it.
7. For each developmental thread, say WHY it matters for practice and WHAT, if anything, appears to be moving over time.
8. Prefer synthesis over labels. Avoid banal headings such as "Boundaries" unless the synthesis underneath is genuinely specific.
9. Distinguish observation from interpretation. Use tentative language for hypotheses.
10. Evidence references support the synthesis; they are not the synthesis itself.
11. If the evidence is sparse, produce fewer, stronger observations rather than padding the output.
12. No praise, reassurance or generic CPD advice.
13. Supervision questions should arise directly from the synthesis and should be specific enough to be useful in a real supervision session.

Return JSON only:
{
  "overview": "A concise 3-5 sentence synthesis of the main developmental picture. Do not list records.",
  "developmental_threads": [
    {
      "title": "specific, interpretive but cautious title",
      "synthesis": "cross-record synthesis, not a recap",
      "movement": "what appears different over time, or 'No clear movement yet'",
      "practice_significance": "why this thread may matter in the therapist's work",
      "evidence_refs": ["R1","R4"],
      "confidence": "strong|moderate|tentative"
    }
  ],
  "tensions_or_contradictions": [
    {
      "title": "a meaningful tension",
      "synthesis": "what seems to pull in two directions and why it may matter",
      "evidence_refs": ["R2","R7"]
    }
  ],
  "supervision_focus": [
    {
      "question": "specific supervision question",
      "why_this_question": "one sentence tying it to the longitudinal pattern",
      "evidence_refs": ["R1","R4"]
    }
  ],
  "limitations": "brief statement about missing or weak evidence"
}

Limits:
- developmental_threads: maximum 4
- tensions_or_contradictions: maximum 3
- supervision_focus: maximum 4
- If there is only one defensible developmental thread, return one.
`

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function truncate(value, max) {
  const text = clean(value)
  return text.length <= max ? text : text.slice(0, max) + '…'
}

function sourceType(reflection) {
  if (reflection?.workspace_content?.captureSource === 'practice_reflection') return 'questionnaire'
  if (reflection?.client_id || reflection?.session_ref) return 'session-linked practice reflection'
  if (reflection?.workspace_content?.captureSource === 'quick_capture') return 'therapist quick reflection'
  return 'therapist reflection'
}

export function isDirectPracticeReflection(reflection) {
  return reflection?.workspace_content?.captureSource !== 'practice_reflection'
}

export function buildGrowthSummaryInput(reflections = []) {
  let usedCharacters = 0
  const records = []

  const ordered = [...reflections]
    .filter(isDirectPracticeReflection)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .slice(-GROWTH_SUMMARY_MAX_REFLECTIONS)

  for (const reflection of ordered) {
    const map = reflection?.workspace_content?.reflectiveMap
    const fields = [`Source: ${sourceType(reflection)}`]
    if (clean(reflection.theme)) fields.push(`Therapist-assigned theme: ${truncate(reflection.theme, 120)}`)
    if (clean(reflection.body)) fields.push(`Reflection: ${truncate(reflection.body, 2600)}`)
    if (clean(reflection.supervision_question)) fields.push(`Supervision question: ${truncate(reflection.supervision_question, 500)}`)
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      if (clean(map.innerPosition)) fields.push(`Inner position: ${truncate(map.innerPosition, 300)}`)
      if (clean(map.protectiveIntention)) fields.push(`Protective intention: ${truncate(map.protectiveIntention, 500)}`)
      if (clean(map.trigger)) fields.push(`Trigger: ${truncate(map.trigger, 500)}`)
      if (clean(map.impact)) fields.push(`Impact: ${truncate(map.impact, 500)}`)
      if (clean(map.spaceCreated)) fields.push(`Space created: ${truncate(map.spaceCreated, 500)}`)
      if (clean(map.supervisionQuestion)) fields.push(`Mapped supervision question: ${truncate(map.supervisionQuestion, 500)}`)
    }

    if (fields.length === 1) continue
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

function confidenceValue(value) {
  const confidence = String(value || '').toLowerCase()
  return ['strong', 'moderate', 'tentative'].includes(confidence) ? confidence : 'tentative'
}

function normalizeThreads(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 4).map(item => ({
    title: stringValue(item?.title, 160),
    synthesis: stringValue(item?.synthesis, 1400),
    movement: stringValue(item?.movement, 700),
    practice_significance: stringValue(item?.practice_significance, 900),
    evidence_refs: evidenceRefs(item?.evidence_refs),
    confidence: confidenceValue(item?.confidence)
  })).filter(item => item.title && item.synthesis)
}

function normalizeTensions(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 3).map(item => ({
    title: stringValue(item?.title, 160),
    synthesis: stringValue(item?.synthesis, 1100),
    evidence_refs: evidenceRefs(item?.evidence_refs)
  })).filter(item => item.title && item.synthesis)
}

function normalizeSupervision(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 4).map(item => ({
    question: stringValue(item?.question, 700),
    why_this_question: stringValue(item?.why_this_question, 700),
    evidence_refs: evidenceRefs(item?.evidence_refs)
  })).filter(item => item.question)
}

export function validateGrowthSummaryResponse(content) {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content
    if (!data || typeof data !== 'object') return null
    return {
      overview: stringValue(data.overview, 1800),
      developmental_threads: normalizeThreads(data.developmental_threads),
      tensions_or_contradictions: normalizeTensions(data.tensions_or_contradictions),
      supervision_focus: normalizeSupervision(data.supervision_focus),
      limitations: stringValue(data.limitations, 1000)
    }
  } catch {
    return null
  }
}
