import { requireAuthenticatedUser } from './_lib/supabase.js';
import { AI_FEATURES, runTextAI } from './_lib/ai-execution.js';
import { buildResult } from '../src/quiz/therapist/buildResult.js';
import { QUIZ_VERSION } from '../src/quiz/therapist/questions.js';
import {
  THERAPEUTIC_STANCE_PROMPT_VERSION,
  therapeuticStanceSystemPrompt,
  buildTherapeuticStanceInput,
  validateTherapeuticStanceAIResponse
} from './_lib/therapeutic-stance-report.js';

const MAX_BODY_BYTES = 20_000;

function invalidRequest(res, message = 'Invalid request body') {
  return res.status(400).json({ error: message });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      await requireAuthenticatedUser(req);
      return res.status(200).json({
        quizVersion: QUIZ_VERSION,
        aiAvailable: Boolean(process.env.OPENAI_API_KEY),
        promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        quizVersion: QUIZ_VERSION,
        aiAvailable: false,
        error: error.status === 401 ? 'Please sign in again.' : 'AI writing status is unavailable.'
      });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const rawLength = Number(req.headers['content-length'] || 0);
    if (rawLength > MAX_BODY_BYTES) return res.status(413).json({ error: 'Request too large' });

    const body = req.body || {};
    const allowedKeys = new Set(['quizVersion', 'answers', 'consent']);
    if (Object.keys(body).some(key => !allowedKeys.has(key))) return invalidRequest(res);
    if (body.quizVersion !== QUIZ_VERSION || body.consent !== true || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return invalidRequest(res);
    }

    // Recompute the deterministic interpretation server-side. The model never receives
    // a client-authored profile or scores that the browser could have altered.
    const result = buildResult(body.answers);
    if (!result.sufficientForNarrative) {
      return res.status(422).json({
        error: 'There is not enough quiz evidence for an AI-written narrative. The question-based reflection remains available.'
      });
    }

    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.THERAPEUTIC_STANCE_REPORT,
      userId: user.id,
      promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION,
      messages: [
        { role: 'system', content: therapeuticStanceSystemPrompt },
        { role: 'user', content: buildTherapeuticStanceInput(result) }
      ],
      responseFormat: { type: 'json_object' },
      maxTokens: 3200,
      timeout: 45_000
    });

    const report = validateTherapeuticStanceAIResponse(completion.choices?.[0]?.message?.content);
    if (!report) {
      return res.status(502).json({ error: 'The AI report could not be safely validated. Your choices have not been changed.' });
    }

    return res.status(200).json({
      mode: 'ai',
      quizVersion: QUIZ_VERSION,
      result,
      report,
      promptVersion: THERAPEUTIC_STANCE_PROMPT_VERSION,
      model
    });
  } catch (error) {
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'AI writing is not configured.' });
    }
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) {
      return res.status(504).json({ error: 'AI writing timed out. Your choices have not been changed.' });
    }
    const status = error.status || 500;
    console.error('[Therapeutic stance report]', error.message);
    return res.status(status).json({ error: status === 401 ? 'Please sign in again.' : 'AI writing is temporarily unavailable. Your choices have not been changed.' });
  }
}
