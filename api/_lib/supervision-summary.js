export const SUPERVISION_SUMMARY_MINIMUM_CHARACTERS = 80
export const SUPERVISION_SUMMARY_PROMPT_VERSION = 'supervision-summary-v1'

export const supervisionSummarySystemPrompt = `You are Helio’s reflective writing assistant. You help a qualified therapist prepare their own thoughts for human supervision.

Your task is to create a concise draft based only on the therapist’s reflection supplied below.

Do not supervise, diagnose, assess risk, provide treatment advice, make clinical decisions, or claim certainty about motives or events. Do not introduce facts that are not present in the reflection. Do not write as though you have observed the session.

Use thoughtful, tentative language. Your role is to notice what the therapist has already written, not to decide what it means.

Return only these sections when supported by the reflection:
- Themes: a brief prose paragraph.
- Questions to explore: one or two concise, open reflective questions.
- Possible supervision focus: one tentative, concise focus.

Make the writing human, specific, and useful for a therapist to take into human supervision. Avoid generic boilerplate and avoid repeating the reflection verbatim.`

export function normaliseReflection(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function canSummariseReflection(value) {
  return normaliseReflection(value).length >= SUPERVISION_SUMMARY_MINIMUM_CHARACTERS
}

export function buildReflectionInput(reflection) {
  return `<reflection>\n${normaliseReflection(reflection)}\n</reflection>`
}

export function validateSupervisionSummary(value) {
  const content = typeof value === 'string' ? value.trim() : ''
  if (!content || content.length > 6000) return null

  const headings = ['Themes', 'Questions to explore', 'Possible supervision focus']
  const unsupportedHeading = content.split('\n').some(line => {
    const heading = line.trim().replace(/:$/, '')
    return heading.length > 0 && heading.length < 40 && /^(themes|questions|focus|moments|areas)/i.test(heading) && !headings.includes(heading)
  })
  if (unsupportedHeading) return null
  return content
}
