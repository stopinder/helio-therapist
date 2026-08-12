import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { aiRephraseSystemPrompt, validateAIRephraseResponse } from '../_lib/ai-rephrase.js';

const AI_REPHRASE_PROMPT_VERSION = 'ai-rephrase-v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const { reflectionId, excerpt, instruction } = req.body;
    if (!reflectionId || typeof reflectionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(reflectionId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REFLECTION_ID', message: 'Invalid reflection ID format' } });
    }
    if (!excerpt || typeof excerpt !== 'string' || excerpt.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EXCERPT', message: 'Invalid or too long excerpt' } });
    }

    const supabase = getSupabaseUserClient(req);
    const { data: reflection, error: fetchError } = await supabase.from('private_reflections').select('id, body').eq('id', reflectionId).single();
    if (fetchError || !reflection) {
      return res.status(404).json({ success: false, error: { code: 'REFLECTION_NOT_FOUND', message: 'Reflection not found or access denied' } });
    }
    if (!reflection.body.includes(excerpt)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EXCERPT', message: 'Excerpt not found in reflection body' } });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'AI reflection support is temporarily unavailable.' } });
    }

    const promptInput = `Original excerpt: "${excerpt}"\n\nInstruction: ${instruction || 'Suggest a clearer version while keeping the original intent.'}`;
    const { completion } = await runTextAI({
      feature: AI_FEATURES.REFLECTION_REPHRASE,
      userId: user.id,
      promptVersion: AI_REPHRASE_PROMPT_VERSION,
      messages: [
        { role: 'system', content: aiRephraseSystemPrompt },
        { role: 'user', content: promptInput }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 20000
    });

    const aiOutput = validateAIRephraseResponse(completion.choices?.[0]?.message?.content);
    if (!aiOutput) return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'AI reflection support is temporarily unavailable.' } });
    console.log(`[AI Rephrase] Success: tokens=${completion.usage?.total_tokens || 0}`);
    return res.status(200).json({ success: true, data: aiOutput });
  } catch (error) {
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) {
      return res.status(504).json({ success: false, error: { code: 'GATEWAY_TIMEOUT', message: 'AI reflection support is temporarily unavailable. Your reflection has not been changed.' } });
    }
    console.error('[AI Rephrase] Error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({ success: false, error: { code: status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR', message: status === 401 ? 'Please sign in again.' : 'AI reflection support is temporarily unavailable. Your reflection has not been changed.' } });
  }
}
