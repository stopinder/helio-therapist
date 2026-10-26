import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { runResearchAI } from '../_lib/research-execution.js';
import { RESEARCH_WORKFLOW_VERSION } from '../_lib/research-workflow.js';
import { isClearlyWorkspaceQuestion } from '../../src/lib/askHeliosIntent.js';
import { isBudgetError } from '../_lib/ai-budget.js';
import { buildNiceGuidanceReply, isNiceGuidanceRequest } from '../../src/lib/niceGuidance.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  try {
    const { user } = await requireAuthenticatedUser(req);
    const supabase = getSupabaseUserClient(req);
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const conversationId = req.body?.conversationId || null;
    if (!query || query.length > 1200) return res.status(400).json({ success: false, error: { code: 'QUERY_REQUIRED', message: 'Provide a research question of up to 1,200 characters.' } });
    if (isClearlyWorkspaceQuestion(query)) return res.status(409).json({ success: false, suggestedMode: 'workspace',
      error: { code: 'WORKSPACE_QUESTION', message: 'Use Workspace to review your practice records.' } });
    // Establish ownership and mode before any credit or external service call.
    let history = [];
    if (conversationId) {
      if (typeof conversationId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(conversationId)) {
        return res.status(400).json({ success: false, error: { code: 'CONVERSATION_INVALID', message: 'Invalid conversation.' } });
      }
      const { data, error } = await supabase.from('ask_helios_conversations').select('id,title')
        .eq('id', conversationId).eq('user_id', user.id).maybeSingle();
      if (error || !data) return res.status(404).json({ success: false, error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found.' } });
      if (/^\[(Workspace|Reflect)\]/.test(data.title || '')) return res.status(409).json({ success: false, error: { code: 'MODE_MISMATCH', message: 'Start a new Research conversation.' } });
      const { data: saved, error: historyError } = await supabase.from('ask_helios_messages').select('role,content')
        .eq('conversation_id', conversationId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(6);
      if (historyError) return res.status(503).json({ success: false, error: { code: 'HISTORY_UNAVAILABLE', message: 'Your saved research context could not be loaded.' } });
      history = (saved || []).reverse();
    }
    // Browser-supplied history is not authoritative. No client clinical records
    // are read here; only this therapist's selected research conversation.
    // Link-only NICE access: validate auth/ownership above, but never call the
    // model, reserve a credit or retrieve NICE content for this source request.
    const result = isNiceGuidanceRequest(query)
      ? buildNiceGuidanceReply()
      : await runResearchAI({ userId: user.id, query, history });
    let activeId = conversationId, saved = true;
    try {
      if (!activeId) {
        const { data, error } = await supabase.from('ask_helios_conversations')
          .insert({ user_id: user.id, title: query.slice(0, 70) }).select('id').single();
        if (error || !data) throw new Error('Unable to create conversation');
        activeId = data.id;
      }
      const { error } = await supabase.from('ask_helios_messages').insert([
        { user_id: user.id, conversation_id: activeId, role: 'user', content: query },
        { user_id: user.id, conversation_id: activeId, role: 'assistant', content: result.answer, citation_metadata: result.references }
      ]);
      if (error) throw new Error('Unable to save messages');
    } catch { saved = false; console.error('[Research] history persistence unavailable'); }
    return res.status(200).json({ success: true, conversationId: activeId, saved, ...result, promptVersion: RESEARCH_WORKFLOW_VERSION,
      ...(saved ? {} : { warning: 'The answer is available, but it could not be saved to history. Copy anything you need to keep.' }) });
  } catch (error) {
    const status = [400, 401, 403, 404, 409, 413, 429, 502, 503, 504].includes(error.status) ? error.status : 502;
    console.error('[Research] request failed', error.code || status);
    const message = isBudgetError(error) ? error.message
      : status === 401 ? 'Please sign in again.'
        : error.code === 'RESEARCH_PROVIDERS_UNAVAILABLE' ? 'PubMed and Europe PMC could not be reached. This is a service problem, not an absence of research.'
          : error.code === 'RESEARCH_CITATION_INVALID' ? 'The answer failed source verification and has not been shown.'
            : status === 504 ? 'The literature search timed out before it could be completed.'
              : 'The research workflow could not complete reliably. No unverified answer has been shown.';
    return res.status(status).json({ success: false, error: { code: error.code || 'RESEARCH_FAILED', message } });
  }
}
