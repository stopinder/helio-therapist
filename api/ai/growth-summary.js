import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js'
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js'
import {
  buildGrowthSummaryInput,
  growthSummarySystemPrompt,
  validateGrowthSummaryResponse,
  GROWTH_SUMMARY_PROMPT_VERSION,
  GROWTH_SUMMARY_MIN_REFLECTIONS,
  GROWTH_SUMMARY_MAX_REFLECTIONS
} from '../_lib/ai-growth-summary.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }

  try {
    const { user } = await requireAuthenticatedUser(req)
    if (Object.keys(req.body || {}).length !== 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request body' } })
    }

    const supabase = getSupabaseUserClient(req)
    const { data: reflections, error } = await supabase
      .from('private_reflections')
      .select('id, body, theme, supervision_question, workspace_content, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(GROWTH_SUMMARY_MAX_REFLECTIONS)

    if (error) {
      console.error('[Growth Summary] Reflection fetch failed:', error.message)
      return res.status(500).json({ success: false, error: { code: 'REFLECTION_FETCH_FAILED', message: 'Could not load reflection history.' } })
    }

    const usable = (reflections || []).filter(reflection =>
      String(reflection.body || '').trim() ||
      String(reflection.theme || '').trim() ||
      reflection?.workspace_content?.reflectiveMap
    )

    if (usable.length < GROWTH_SUMMARY_MIN_REFLECTIONS) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'NOT_ENOUGH_REFLECTIONS',
          message: `At least ${GROWTH_SUMMARY_MIN_REFLECTIONS} saved reflections are needed for a longitudinal summary.`
        }
      })
    }

    const input = buildGrowthSummaryInput(usable)
    if (!input.trim()) {
      return res.status(422).json({ success: false, error: { code: 'NOT_ENOUGH_CONTENT', message: 'There is not enough reflection content to summarise yet.' } })
    }

    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.GROWTH_LONGITUDINAL_SUMMARY,
      userId: user.id,
      promptVersion: GROWTH_SUMMARY_PROMPT_VERSION,
      messages: [
        { role: 'system', content: growthSummarySystemPrompt },
        { role: 'user', content: `Reflection history follows. References are chronological and must be used in evidence_refs.\n\n${input}` }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 1800,
      timeout: 30000
    })

    const summary = validateGrowthSummaryResponse(completion.choices?.[0]?.message?.content)
    if (!summary?.overview) {
      return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'The longitudinal summary could not be generated.' } })
    }

    const sourceDates = [...usable]
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .slice(-GROWTH_SUMMARY_MAX_REFLECTIONS)
      .map((reflection, index) => ({
        ref: `R${index + 1}`,
        date: reflection.created_at ? String(reflection.created_at).slice(0, 10) : null
      }))

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        source_dates: sourceDates,
        reflection_count: usable.length,
        generated_at: new Date().toISOString(),
        prompt_version: GROWTH_SUMMARY_PROMPT_VERSION,
        model
      }
    })
  } catch (error) {
    console.error('[Growth Summary] Error:', error.message)
    const status = error.status || 500
    return res.status(status).json({
      success: false,
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : (error.code || 'INTERNAL_SERVER_ERROR'),
        message: status === 401 ? 'Please sign in again.' : 'The longitudinal summary is temporarily unavailable.'
      }
    })
  }
}
