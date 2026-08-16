import { requireAuthenticatedUser, getSupabaseClient } from '../_lib/supabase.js';
import { loadOwnedClientAIContext } from '../_lib/client-ai-context.js';
import { resolveLensConfig } from '../_lib/clinical-lenses.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { buildCareSuggestionsPrompt, CARE_SUGGESTIONS_PROMPT_VERSION, validateCareSuggestions } from '../_lib/ai-care-suggestions.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } });
  try {
    const { user } = await requireAuthenticatedUser(req);
    const clientId = String(req.body?.clientId || '').trim();
    const input = String(req.body?.input || '').trim();
    const steering = String(req.body?.steering || '').trim();
    const currentCare = Array.isArray(req.body?.currentCare) ? req.body.currentCare.slice(0, 30) : [];
    const lensId = String(req.body?.lensId || '').trim();

    if (!UUID_PATTERN.test(clientId)) return res.status(400).json({ success:false, error:{ code:'INVALID_CLIENT_ID', message:'Open a valid client before asking Helio for Care suggestions.' } });
    if (!input) return res.status(400).json({ success:false, error:{ code:'INPUT_REQUIRED', message:'Add a thought or observation before asking Helio for suggestions.' } });
    if (input.length > 6000) return res.status(400).json({ success:false, error:{ code:'INPUT_TOO_LONG', message:'Please shorten this reflection before generating suggestions.' } });

    const lensConfig = resolveLensConfig(lensId);
    const context = await loadOwnedClientAIContext(getSupabaseClient(), { clientId, userId:user.id });
    if (!context) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found.' } });

    const approvedContext = context.sessions.map((s, i) => `Approved session ${i+1}: ${s.content}`).join('\n');
    const prompt = buildCareSuggestionsPrompt({ lensConfig, input, steering, currentCare, approvedContext });
    const { completion } = await runTextAI({
      feature: AI_FEATURES.CARE_SUGGESTIONS,
      userId: user.id,
      promptVersion: CARE_SUGGESTIONS_PROMPT_VERSION,
      messages:[
        {role:'system',content:'Be concise, tentative, clinically respectful, preserve clinician agency, and prefer updating an existing formulation only when the meaning has genuinely evolved.'},
        {role:'user',content:prompt}
      ],
      responseFormat:{type:'json_object'},
      temperature:0.4,
      maxTokens:1400
    });
    const validCareIds = new Set(currentCare.map(item => item?.id).filter(Boolean));
    const suggestions = validateCareSuggestions(completion.choices?.[0]?.message?.content, { allowedKinds:lensConfig.allowedKinds, validCareIds, promptVersion:CARE_SUGGESTIONS_PROMPT_VERSION });
    if (!suggestions) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Helio could not generate suggestions just now. Your note has been kept on screen.' } });
    return res.status(200).json({ success:true, suggestions, contextVersion:context.version, promptVersion:CARE_SUGGESTIONS_PROMPT_VERSION });
  } catch (error) {
    console.error('[Care suggestions] failed', error.message);
    const status = error.status || 500;
    const unavailable = error.code === 'AI_PROVIDER_NOT_CONFIGURED' || error.name === 'OpenAIConnectionTimeoutError';
    return res.status(unavailable ? (error.status || 503) : status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':'CARE_SUGGESTIONS_FAILED', message:status===401?'Please sign in again.':'Helio could not generate suggestions just now. Your note has been kept on screen.' } });
  }
}
