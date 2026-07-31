import OpenAI from 'openai';
import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
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
    const { user } = await requireAuthenticatedUser(req);
    
    // Issue 5: Reject bodies containing fields other than reflectionId
    const bodyKeys = Object.keys(req.body || {});
    if (bodyKeys.length !== 1 || bodyKeys[0] !== 'reflectionId') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Invalid request body' }
      });
    }

    const { reflectionId } = req.body;

    // Issue 5: Enforce valid reflection ID format (UUID check)
    if (!reflectionId || typeof reflectionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(reflectionId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFLECTION_ID', message: 'Invalid reflection ID format' }
      });
    }

    // Issue 1: Use Supabase client with user's token to apply RLS
    const supabase = getSupabaseUserClient(req);

    // 1. Load the reflection from private_reflections, ensuring ownership
    const { data: reflection, error: fetchError } = await supabase
      .from('private_reflections')
      .select('id, body, theme, supervision_question')
      .eq('id', reflectionId)
      .single();

    if (fetchError || !reflection) {
      return res.status(404).json({
        success: false,
        error: { code: 'REFLECTION_NOT_FOUND', message: 'Reflection not found or access denied' }
      });
    }

    // 2. Data minimisation & validation
    const reflectionBody = (reflection.body || '').trim();
    if (reflectionBody.length < AI_REFLECTION_MINIMUM_CHARACTERS) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'REFLECTION_TOO_SHORT',
          message: `Reflection is too short for AI support (minimum ${AI_REFLECTION_MINIMUM_CHARACTERS} characters).`
        }
      });
    }

    if (reflectionBody.length > AI_REFLECTION_MAX_INPUT_CHARACTERS) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'REFLECTION_TOO_LONG',
            message: 'Reflection is too long for the current AI assistant Phase.'
          }
        });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI Reflection] API key missing');
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'AI reflection support is temporarily unavailable.' }
      });
    }

    // 3. Call OpenAI with timeout (Issue 3)
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20000 // 20 seconds
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: aiReflectionSystemPrompt },
        { role: 'user', content: buildReflectionInput(reflection) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000 // Issue 5: Limit output tokens
    });

    // 4. Validate & clean response (Issue 4)
    const aiOutput = validateAIReflectionResponse(completion.choices?.[0]?.message?.content);
    if (!aiOutput) {
      console.error('[AI Reflection] Validation failed');
      return res.status(502).json({
        success: false,
        error: { code: 'INVALID_AI_RESPONSE', message: 'AI reflection support is temporarily unavailable.' }
      });
    }

    // 5. Logging (Issue 2: Permitted logs only, NO user_id or reflection content)
    console.log(`[AI Reflection] Success: tokens=${completion.usage?.total_tokens || 0}`);

    return res.status(200).json({
      success: true,
      data: aiOutput
    });
  } catch (error) {
    // Issue 3: Handle timeout
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) {
      return res.status(504).json({
        success: false,
        error: { code: 'GATEWAY_TIMEOUT', message: 'AI reflection support is temporarily unavailable. Your reflection has not been changed.' }
      });
    }

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
