import OpenAI from 'openai';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import {
  aiReflectionSystemPrompt,
  buildReflectionInput,
  validateAIReflectionResponse,
  AI_REFLECTION_MINIMUM_CHARACTERS,
  AI_REFLECTION_MAX_INPUT_CHARACTERS
} from '../_lib/ai-reflection.js';

const model = process.env.OPENAI_REFLECTION_MODEL || 'gpt-4o-mini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { reflectionId } = req.body;

    if (!reflectionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REFLECTION_ID', message: 'Reflection ID is required' }
      });
    }

    // 1. Load the reflection from private_reflections, ensuring ownership
    // We use the service-role client provided by requireAuthenticatedUser but filter by user.id
    const { data: reflection, error: fetchError } = await supabase
      .from('private_reflections')
      .select('id, user_id, body, theme, supervision_question')
      .eq('id', reflectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !reflection) {
      return res.status(404).json({
        success: false,
        error: { code: 'REFLECTION_NOT_FOUND', message: 'Reflection not found or access denied' }
      });
    }

    // 2. Data minimisation & validation
    const body = (reflection.body || '').trim();
    if (body.length < AI_REFLECTION_MINIMUM_CHARACTERS) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'REFLECTION_TOO_SHORT',
          message: `Reflection is too short for AI support (minimum ${AI_REFLECTION_MINIMUM_CHARACTERS} characters).`
        }
      });
    }

    if (body.length > AI_REFLECTION_MAX_INPUT_CHARACTERS) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'REFLECTION_TOO_LONG',
            message: 'Reflection is too long for the current AI assistant Phase.'
          }
        });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI Reflection] OPENAI_API_KEY is missing');
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'AI reflection support is temporarily unavailable.' }
      });
    }

    // 3. Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: aiReflectionSystemPrompt },
        { role: 'user', content: buildReflectionInput(reflection) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    // 4. Validate & clean response
    const aiOutput = validateAIReflectionResponse(completion.choices?.[0]?.message?.content);
    if (!aiOutput) {
      console.error('[AI Reflection] Malformed AI response');
      return res.status(502).json({
        success: false,
        error: { code: 'INVALID_AI_RESPONSE', message: 'AI reflection support is temporarily unavailable.' }
      });
    }

    // 5. Logging (Permitted logs only)
    console.log(`[AI Reflection] Success: req_id=${req.headers['x-vercel-id'] || 'local'}, user_id=${user.id}, tokens=${completion.usage?.total_tokens || 0}`);

    return res.status(200).json({
      success: true,
      data: aiOutput
    });

  } catch (error) {
    console.error('[AI Reflection] Error:', error.message);
    const status = error.status || 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    
    return res.status(status).json({
      success: false,
      error: { 
        code: status === 401 ? 'UNAUTHORIZED' : code,
        message: status === 401 ? 'Please sign in again.' : 'AI reflection support is temporarily unavailable. Your reflection has not been changed.'
      }
    });
  }
}
