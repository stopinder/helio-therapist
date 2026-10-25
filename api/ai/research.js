import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { buildResearchAssistantPrompt, RESEARCH_ASSISTANT_PROMPT_VERSION, parseResearchResponse, validateAndFormatReferences } from '../_lib/ai-research.js';
import { searchResearch } from '../_lib/research-retrieval.js';

async function generateResearchQueries(query, history, userId) {
  try {
    const { completion } = await runTextAI({
      feature: AI_FEATURES.ASK_HELIOS_RESEARCH,
      userId,
      promptVersion: 'query-gen-1.0.0',
      messages: [
        { 
          role: 'system', 
          content: 'You are a research query generator. Extract 2-3 specific, targeted search queries for PubMed/Europe PMC from the user\'s question. Focus on clinical concepts, therapies, and conditions. Use Boolean operators if helpful. Output a JSON array of strings.' 
        },
        { role: 'user', content: `Question: ${query}\nHistory: ${JSON.stringify(history.slice(-2))}` }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0,
      maxTokens: 200,
      skipBudget: true
    });
    const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    const queries = Array.isArray(parsed.queries) ? parsed.queries : [query];
    return queries.slice(0, 3);
  } catch (e) {
    console.error('[Query Gen] failed', e.message);
    return [query];
  }
}

async function performMultiQuerySearch(queries) {
  const allResults = await Promise.all(queries.map(q => searchResearch(q)));
  const flat = allResults.flat();
  
  const seen = new Set();
  return flat.filter(r => {
    const key = (r.doi || r.pmid || r.pmcid || r.title.toLowerCase()).toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

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
    const researchQueries = await generateResearchQueries(query, history, user.id);
    let researchContext;
    try {
      researchContext = await performMultiQuerySearch(researchQueries);
    } catch (e) {
      console.error('[Ask Helios Research] search failed:', e.message);
      return res.status(502).json({
        success: false,
        error: { 
          code: 'RESEARCH_PROVIDER_FAILED', 
          message: 'Clinical research providers (PubMed/Europe PMC) are currently unreachable. Please try again in a few minutes.' 
        }
      });
    }

    if (researchContext.length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I couldn't find any specific clinical research in PubMed or Europe PMC that directly addresses your question. This may indicate an evidence gap in the current literature. Would you like to try rephrasing your search?",
        references: [],
        promptVersion: RESEARCH_ASSISTANT_PROMPT_VERSION
      });
    }

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
    if (msgErr) {
      // If we failed to save to DB, don't throw as we've already consumed the AI credit.
      // Just return the result to the user.
      console.error('[Ask Helios Research] DB persistence failed', msgErr.message);
    }

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
