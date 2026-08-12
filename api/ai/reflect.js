import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import {
  aiReflectionSystemPrompt,
  buildReflectionInput,
  validateAIReflectionResponse,
  AI_REFLECTION_PROMPT_VERSION,
  AI_REFLECTION_MINIMUM_CHARACTERS,
  AI_REFLECTION_MAX_INPUT_CHARACTERS
} from '../_lib/ai-reflection.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const bodyKeys = Object.keys(req.body || {});
    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'reflectionId') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid request body' } });
    }

    const { reflectionId } = req.body;
    if (!reflectionId || typeof reflectionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(reflectionId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REFLECTION_ID', message: 'Invalid reflection ID format' } });
    }

    const supabase = getSupabaseUserClient(req);
    const { data: reflection, error: fetchError } = await supabase
      .from('private_reflections').select('id, body, theme, supervision_question').eq('id', reflectionId).single();
    if (fetchError || !reflection) {
      return res.status(404).json({ success: false, error: { code: 'REFLECTION_NOT_FOUND', message: 'Reflection not found or access denied' } });
    }

    const reflectionBody = (reflection.body || '').trim();
    if (reflectionBody.length < AI_REFLECTION_MINIMUM_CHARACTERS) {
      return res.status(422).json({ success: false, error: { code: 'REFLECTION_TOO_SHORT', message: `Reflection is too short for AI support (minimum ${AI_REFLECTION_MINIMUM_CHARACTERS} characters).` } });
    }
    if (reflectionBody.length > AI_REFLECTION_MAX_INPUT_CHARACTERS) {
      return res.status(422).json({ success: false, error: { code: 'REFLECTION_TOO_LONG', message: 'Reflection is too long for the current AI assistant Phase.' } });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI Reflection] API key missing');
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'AI reflection support is temporarily unavailable.' } });
    }

    const { completion } = await runTextAI({
      feature: AI_FEATURES.REFLECTION_ANALYSIS,
      userId: user.id,
      promptVersion: AI_REFLECTION_PROMPT_VERSION,
      messages: [
        { role: 'system', content: aiReflectionSystemPrompt },
        { role: 'user', content: buildReflectionInput(reflection) }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 20000
    });

    const aiOutput = validateAIReflectionResponse(completion.choices?.[0]?.message?.content);
    if (!aiOutput) {
      console.error('[AI Reflection] Validation failed');
      return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'AI reflection support is temporarily unavailable.' } });
    }
    console.log(`[AI Reflection] Success: tokens=${completion.usage?.total_tokens || 0}`);
    return res.status(200).json({ success: true, data: aiOutput });
  } catch (error) {
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) {
      return res.status(504).json({ success: false, error: { code: 'GATEWAY_TIMEOUT', message: 'AI reflection support is temporarily unavailable. Your reflection has not been changed.' } });
    }
    console.error('[AI Reflection] Error:', error.message);
    const status = error.status || 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    return res.status(status).json({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : code, message: status === 401 ? 'Please sign in again.' : 'AI reflection support is temporarily unavailable. Your reflection has not been changed.' } });
  }
}
