export const CLIENT_DOCUMENT_PROMPT_VERSION = 'client-document-clinical-intelligence-v1'
export const CLIENT_DOCUMENT_PERSPECTIVES = Object.freeze(['general', 'gentle_cbt', 'integrative'])
export const CLIENT_DOCUMENT_FIELDS = Object.freeze([
  'opening',
  'whatWeWorkedOn',
  'patternsOverTime',
  'changesAndExceptions',
  'strengthsAndResources',
  'perspectiveReflection',
  'betweenSession',
  'closing'
])

const PERSPECTIVE_INSTRUCTIONS = Object.freeze({
  general: 'Use a clear, compassionate, non-theoretical reflection. Prefer ordinary language over clinical terminology.',
  gentle_cbt: 'Where the evidence supports it, describe gentle CBT sequences: situation or trigger -> thoughts, emotions or body responses -> coping or behaviour -> short- and longer-term consequences. Include interruptions, exceptions and small experiments. Do not force a CBT sequence when the evidence is incomplete.',
  integrative: 'Integrate emotional, relational, behavioural and contextual themes without presenting one theory as the explanation. Hold alternative meanings lightly and name uncertainty when appropriate.'
})

export const clientDocumentSystemPrompt = `You prepare a substantial client-facing therapy reflection from therapist-approved material.
The reader is the client. Write directly, warmly and respectfully, using plain English and preserving dignity and agency.
Use only supplied evidence. Never invent diagnosis, risk conclusions, causality, treatment response, intent, history or therapist beliefs.
Repeated material may be described as recurring, but recurrence is not proof of cause. Absence of a theme is not evidence of improvement.
Distinguish source types. Therapist-authored guidance is therapist perspective, not something the client said. Current Care items are therapist-reviewed working context, not verbatim client statements.
Compare sessions longitudinally: recurrence, change, stability, exceptions or resources, and unfinished threads. Prefer specific supported connections over generic wellness language.
Do not mention raw transcripts, internal records, AI, prompts, source IDs or provenance mechanics in the client-facing wording.
Return JSON only with exactly these string fields: ${CLIENT_DOCUMENT_FIELDS.join(', ')}. Empty evidence should produce an empty string rather than filler.`

export function normaliseTherapistGuidance(value) {
  return String(value || '').trim().slice(0, 6000)
}

export function buildClientDocumentInput({ context, careItems = [], perspective = 'general', therapistGuidance = '' }) {
  if (!context?.clientId) throw new Error('Client context is required')
  if (!CLIENT_DOCUMENT_PERSPECTIVES.includes(perspective)) throw new Error('Unsupported client document perspective')

  const sessions = (context.sessions || []).map((session, index) => ({
    order: index === 0 ? 'current' : `previous_${index}`,
    occurredAt: session.occurredAt || null,
    content: session.content
  }))
  const care = careItems
    .filter(item => item?.body)
    .map(item => ({ kind: item.kind, content: String(item.body).trim() }))
  const guidance = normaliseTherapistGuidance(therapistGuidance)

  return `Prepare the client-facing reflection using this evidence packet.\n\nPerspective: ${perspective}\nPerspective instruction: ${PERSPECTIVE_INSTRUCTIONS[perspective]}\n\n<client_current_focus>\n${context.currentFocus || ''}\n</client_current_focus>\n\n<reviewed_sessions_json>\n${JSON.stringify(sessions)}\n</reviewed_sessions_json>\n\n<current_care_json>\n${JSON.stringify(care)}\n</current_care_json>\n\n<therapist_authored_guidance>\n${guidance}\n</therapist_authored_guidance>`
}

export function validateClientDocumentResponse(raw) {
  let parsed
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const keys = Object.keys(parsed)
  if (keys.length !== CLIENT_DOCUMENT_FIELDS.length || !CLIENT_DOCUMENT_FIELDS.every(key => keys.includes(key))) return null
  const result = {}
  for (const key of CLIENT_DOCUMENT_FIELDS) {
    if (typeof parsed[key] !== 'string') return null
    result[key] = parsed[key].trim().slice(0, 7000)
  }
  return result
}

export function renderClientDocument(sections, perspective = 'general') {
  if (!sections || !CLIENT_DOCUMENT_PERSPECTIVES.includes(perspective)) return ''
  const perspectiveHeading = perspective === 'gentle_cbt' ? 'A gentle CBT perspective' : perspective === 'integrative' ? 'An integrative perspective' : 'Making sense of what we have noticed'
  const ordered = [
    ['Where things are now', sections.opening],
    ['What we have been working on', sections.whatWeWorkedOn],
    ['Patterns across our recent work', sections.patternsOverTime],
    ['What has shifted — and what has been different', sections.changesAndExceptions],
    ['Strengths and resources', sections.strengthsAndResources],
    [perspectiveHeading, sections.perspectiveReflection],
    ['Ideas to carry forward', sections.betweenSession],
    ['Closing reflection', sections.closing]
  ]
  return ordered.filter(([, body]) => String(body || '').trim()).map(([heading, body]) => `${heading}\n${String(body).trim()}`).join('\n\n')
}
