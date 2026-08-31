import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { CLIENT_SESSION_SUMMARY_LENSES, CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, clientSessionSummarySystemPrompt, renderClientSessionSummary, validateClientSessionSummaryResponse } from '../_lib/ai-client-session-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } }); }
  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, lens='general', window='last_three', therapistGuidance='' } = req.body || {};
    if (!clientId || typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId) || !CLIENT_SESSION_SUMMARY_LENSES.includes(lens) || !['current','last_three'].includes(window) || typeof therapistGuidance !== 'string' || therapistGuidance.length > 6000) {
      return res.status(400).json({ success:false, error:{ code:'INVALID_REQUEST', message:'Choose a valid client, lens and summary window.' } });
    }
    const { data: ownedClient, error: clientError } = await supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle();
    if (clientError) throw clientError;
    if (!ownedClient) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found or access denied.' } });

    const captureLimit = window === 'current' ? 1 : 3;
    const { data: captures, error: captureError } = await supabase.from('session_capture_drafts').select('session_id,content,reviewed_at,sessions!inner(id,occurred_at,user_id,client_id)').eq('client_id', clientId).eq('user_id', user.id).eq('status', 'reviewed').not('reviewed_at', 'is', null).order('reviewed_at', { ascending:false }).limit(3);
    if (captureError) throw captureError;
    const selectedCaptures = (captures || []).slice(0, captureLimit).map(row => ({ sessionId:row.session_id, occurredAt:row.sessions?.occurred_at, reviewedAt:row.reviewed_at, content:row.content || {} }));
    if (!selectedCaptures.length) return res.status(409).json({ success:false, error:{ code:'NO_REVIEWED_SESSION_CAPTURE', message:'Review a Session Capture before generating a client summary.' } });

    const { data: careItems, error: careError } = await supabase.from('client_care_items').select('kind,body,status,origin,provenance_session_id').eq('client_id', clientId).eq('therapist_id', user.id).eq('status', 'current').order('updated_at', { ascending:false }).limit(30);
    if (careError) throw careError;

    const { completion } = await runTextAI({
      feature:AI_FEATURES.CLIENT_SESSION_SUMMARY, userId:user.id, promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,
      messages:[{role:'system',content:clientSessionSummarySystemPrompt(lens)},{role:'user',content:buildClientSessionSummaryInput({lens,window,captures:selectedCaptures,careItems:careItems||[],therapistGuidance})}],
      responseFormat:{type:'json_object'}, temperature:0.2, maxTokens:2600
    });
    const sections = validateClientSessionSummaryResponse(completion.choices?.[0]?.message?.content);
    if (!sections) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Client summary generation is temporarily unavailable.' } });
    const body = renderClientSessionSummary(sections, lens);
    if (body.length < 120) return res.status(502).json({ success:false, error:{ code:'INVALID_AI_RESPONSE', message:'Client summary generation is temporarily unavailable.' } });
    return res.status(200).json({ success:true, data:{ draft:{body,sections}, lens, window, sessionCount:selectedCaptures.length, promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION } });
  } catch (error) {
    if (error.name === 'OpenAIConnectionTimeoutError' || error.status === 504) return res.status(504).json({ success:false, error:{ code:'GATEWAY_TIMEOUT', message:'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
    if (error.code === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'Client summary generation is temporarily unavailable.' } });
    console.error('[Client Session Summary] Error:', error.message);
    const status=error.status||500; return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':(error.code||'INTERNAL_SERVER_ERROR'), message:status===401?'Please sign in again.':'Client summary generation is temporarily unavailable. Nothing has been saved.' } });
  }
}
