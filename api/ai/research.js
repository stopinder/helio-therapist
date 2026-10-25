import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { buildResearchAssistantPrompt, RESEARCH_ASSISTANT_PROMPT_VERSION, parseResearchResponse, validateAndFormatReferences } from '../_lib/ai-research.js';
import { searchResearch } from '../_lib/research-retrieval.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });

  try {
    const { user } = await requireAuthenticatedUser(req);
    const supabase = getSupabaseUserClient(req);
    const query = String(req.body?.query || '').trim();
    const conversationId = req.body?.conversationId;
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'QUERY_REQUIRED', message: 'Please provide a research question.' } });
    }

    // 1. Genuine research retrieval
    const researchContext = await searchResearch(query);

    const prompt = buildResearchAssistantPrompt({ query, history, researchContext });

    // 2. Run AI with context
    const { completion } = await runTextAI({
      feature: AI_FEATURES.ASK_HELIOS_RESEARCH,
      userId: user.id,
      promptVersion: RESEARCH_ASSISTANT_PROMPT_VERSION,
      messages: [
        { role: 'system', content: 'You are Ask Helios, a specialized AI research assistant for therapists. Rely on the provided research context.' },
        { role: 'user', content: prompt }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.1, // Lower temperature for higher integrity
      maxTokens: 2000
    });

    const aiResult = parseResearchResponse(completion.choices?.[0]?.message?.content);
    
    // 3. Enforce citation integrity
    const finalResult = validateAndFormatReferences(aiResult, researchContext);

    // 4. Secure Supabase Persistence
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const { data: conv, error: convErr } = await supabase
        .from('ask_helios_conversations')
        .insert({ user_id: user.id, title: query.slice(0, 50) })
        .select()
        .single();
      if (convErr) throw convErr;
      activeConversationId = conv.id;
    }

    // Save messages
    const { error: msgErr } = await supabase
      .from('ask_helios_messages')
      .insert([
        { conversation_id: activeConversationId, user_id: user.id, role: 'user', content: query },
        { 
          conversation_id: activeConversationId, 
          user_id: user.id, 
          role: 'assistant', 
          content: finalResult.answer, 
          citation_metadata: finalResult.references 
        }
      ]);
    if (msgErr) throw msgErr;

    return res.status(200).json({
      success: true,
      conversationId: activeConversationId,
      answer: finalResult.answer,
      references: finalResult.references,
      promptVersion: RESEARCH_ASSISTANT_PROMPT_VERSION
    });

  } catch (error) {
    console.error('[Ask Helios Research] failed', error.message);
    const status = error.status || 500;
    
    return res.status(status).json({
      success: false,
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : 'RESEARCH_FAILED',
        message: status === 401 ? 'Please sign in again.' : 'Helio research assistant could not answer just now. Please try again.'
      }
    });
  }
}
