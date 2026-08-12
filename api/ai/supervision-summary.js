import { requireAuthenticatedUser } from '../_lib/supabase.js'
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js'
import { AI_MODEL_POLICY_VERSION, findReusableSupervisionArtifact, hashArtifactSource, persistGeneratedSupervisionArtifact } from '../_lib/ai-artifacts.js'
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
    const { supabase, user } = await requireAuthenticatedUser(req)
    const reflectionId = String(req.body?.reflectionId || '').trim()
    if (!reflectionId) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_REQUIRED', message: 'Choose a saved reflection before creating a summary.' } })
    }

    const { data: reflectionRecord, error: reflectionError } = await supabase
      .from('private_reflections')
      .select('id, body')
      .eq('id', reflectionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (reflectionError) throw reflectionError
    if (!reflectionRecord) {
      return res.status(404).json({ success: false, error: { code: 'REFLECTION_NOT_FOUND', message: 'That reflection is not available.' } })
    }

    const reflection = normaliseReflection(reflectionRecord.body)
    if (!canSummariseReflection(reflection)) {
      return res.status(422).json({ success: false, error: { code: 'REFLECTION_TOO_SHORT', message: `Please write a little more before creating a summary (${SUPERVISION_SUMMARY_MINIMUM_CHARACTERS} characters).` } })
    }

    const sourceHash = hashArtifactSource(reflection)
    if (req.body?.forceRegenerate !== true) {
      const reusable = await findReusableSupervisionArtifact(supabase, {
        reflectionId: reflectionRecord.id,
        sourceHash,
        promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION
      })
      const cachedContent = validateSupervisionSummary(reusable?.generated_content)
      if (cachedContent) {
        return res.status(200).json({ success: true, summary: cachedContent, model: reusable.model, promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION, modelPolicyVersion: AI_MODEL_POLICY_VERSION, generatedFor: user.id, reused: true })
      }
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

    await persistGeneratedSupervisionArtifact(supabase, {
      reflectionId: reflectionRecord.id,
      userId: user.id,
      generatedContent: content,
      model,
      promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION,
      sourceHash
    })

    return res.status(200).json({ success: true, summary: content, model, promptVersion: SUPERVISION_SUMMARY_PROMPT_VERSION, modelPolicyVersion: AI_MODEL_POLICY_VERSION, generatedFor: user.id, reused: false })
  } catch (error) {
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Summary generation is not available right now. Please try again later.' } })
    }
    console.error('[Supervision Summary] Error:', error.message, error.stack)
    const status = error.status || 500
    return res.status(status).json({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'SUMMARY_GENERATION_FAILED', message: status === 401 ? 'Please sign in again.' : 'The draft could not be prepared. Your reflection was not changed; please try again.' } })
  }
}
