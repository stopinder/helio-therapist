import OpenAI from 'openai'
import { requireAuthenticatedUser } from '../_lib/supabase.js'
import {
  SUPERVISION_SUMMARY_MINIMUM_CHARACTERS,
  SUPERVISION_SUMMARY_PROMPT_VERSION,
  buildReflectionInput,
  canSummariseReflection,
  normaliseReflection,
  supervisionSummarySystemPrompt,
  validateSupervisionSummary
} from '../_lib/supervision-summary.js'

const model = 'gpt-4.1-mini'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user } = await requireAuthenticatedUser(req)
    const reflection = normaliseReflection(req.body?.reflection)
    if (!canSummariseReflection(reflection)) {
      return res.status(422).json({ error: `Please write a little more before creating a summary (${SUPERVISION_SUMMARY_MINIMUM_CHARACTERS} characters).` })
    }
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Summary generation is not available right now. Please try again later.' })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: supervisionSummarySystemPrompt },
        { role: 'user', content: buildReflectionInput(reflection) }
      ]
    })
    const content = validateSupervisionSummary(completion.choices?.[0]?.message?.content)
    if (!content) return res.status(502).json({ error: 'The draft could not be prepared safely. Please try again.' })

    return res.status(200).json({ content, model, promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION, generatedFor: user.id })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: status === 401 ? 'Please sign in again.' : 'The draft could not be prepared. Your reflection was not changed; please try again.' })
  }
}
