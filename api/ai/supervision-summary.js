import { requireAuthenticatedUser } from '../_lib/supabase.js'
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js'
import {
  SUPERVISION_SUMMARY_MINIMUM_CHARACTERS,
  SUPERVISION_SUMMARY_PROMPT_VERSION,
  buildReflectionInput,
  canSummariseReflection,
  normaliseReflection,
  supervisionSummarySystemPrompt,
  validateSupervisionSummary
} from '../_lib/supervision-summary.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json')
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }

  try {
    const { user } = await requireAuthenticatedUser(req)
    const reflection = normaliseReflection(req.body?.reflection)
    if (!canSummariseReflection(reflection)) {
      return res.status(422).json({ success: false, error: { code: 'REFLECTION_TOO_SHORT', message: `Please write a little more before creating a summary (${SUPERVISION_SUMMARY_MINIMUM_CHARACTERS} characters).` } })
    }

    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.SUPERVISION_SUMMARY,
      userId: user.id,
      promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION,
      temperature: 0.2,
      messages: [
        { role: 'system', content: supervisionSummarySystemPrompt },
        { role: 'user', content: buildReflectionInput(reflection) }
      ]
    })
    const content = validateSupervisionSummary(completion.choices?.[0]?.message?.content)
    if (!content) {
      console.error('[Supervision Summary] Validation failed for AI response')
      return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'The draft could not be prepared safely. Please try again.' } })
    }

    return res.status(200).json({ success: true, summary: content, model, promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION, generatedFor: user.id })
  } catch (error) {
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Summary generation is not available right now. Please try again later.' } })
    }
    console.error('[Supervision Summary] Error:', error.message, error.stack)
    const status = error.status || 500
    return res.status(status).json({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'SUMMARY_GENERATION_FAILED', message: status === 401 ? 'Please sign in again.' : 'The draft could not be prepared. Your reflection was not changed; please try again.' } })
  }
}
