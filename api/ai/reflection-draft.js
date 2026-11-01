import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import {
  ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION,
  askHeliosReflectionDraftSystemPrompt,
  buildAskHeliosReflectionDraftInput,
  validateAskHeliosReflectionDraft
} from '../_lib/ask-helios-reflection-draft.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed.' } });

  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseUserClient(req);
    const conversationId = String(req.body?.conversationId || '').trim();

    if (!UUID_PATTERN.test(conversationId)) {
      return res.status(400).json({ success:false, error:{ code:'INVALID_CONVERSATION', message:'Open a saved Ask Helios conversation before sending it to Reflect.' } });
    }

    const { data: conversation, error: conversationError } = await db
      .from('ask_helios_conversations')
      .select('id,title')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return res.status(404).json({ success:false, error:{ code:'CONVERSATION_NOT_FOUND', message:'That Ask Helios conversation is not available.' } });

    const allowed = conversation.title?.startsWith('[Reflect]') || conversation.title?.startsWith('[Workspace]');
    if (!allowed) {
      return res.status(400).json({ success:false, error:{ code:'UNSUPPORTED_CONVERSATION', message:'Send a Reflect or clinically scoped Workspace conversation to Reflect.' } });
    }

    const { data: recentRows, error: messageError } = await db
      .from('ask_helios_messages')
      .select('role,content,created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .in('role', ['user','assistant'])
      .order('created_at', { ascending:false })
      .limit(12);
    if (messageError) throw messageError;

    const messages = [...(recentRows || [])].reverse();
    const therapistText = messages.filter(message => message.role === 'user').map(message => String(message.content || '').trim()).filter(Boolean).join('\n');
    if (therapistText.length < 20) {
      return res.status(409).json({ success:false, error:{ code:'INSUFFICIENT_REFLECTIVE_MATERIAL', message:'There is not enough therapist-authored material in this conversation to prepare a reflection draft yet.' } });
    }

    const input = buildAskHeliosReflectionDraftInput(messages);
    const { completion } = await runTextAI({
      feature: AI_FEATURES.REFLECTION_ANALYSIS,
      userId: user.id,
      promptVersion: ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION,
      messages: [
        { role:'system', content:askHeliosReflectionDraftSystemPrompt },
        { role:'user', content:input }
      ],
      responseFormat:{ type:'json_object' },
      temperature:0.2,
      maxTokens:1600,
      timeout:45000
    });

    const draft = validateAskHeliosReflectionDraft(completion.choices?.[0]?.message?.content);
    if (!draft) {
      return res.status(502).json({ success:false, error:{ code:'INVALID_REFLECTION_DRAFT', message:'Helios could not prepare a safe reflection draft from this conversation. Nothing has been saved.' } });
    }

    return res.status(200).json({
      success:true,
      data:{
        ...draft,
        conversationId,
        promptVersion:ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION
      }
    });
  } catch (error) {
    console.error('[Ask Helios -> Reflect] draft failed', error.code || error.message);
    const status = [400,401,404,409,413,429,502,503].includes(error.status) ? error.status : 500;
    const message = status===401 ? 'Please sign in again.'
      : status===413 || status===429 ? 'The AI allowance or request limit has been reached.'
      : status===503 ? 'Reflection drafting is temporarily unavailable.'
      : status===502 ? 'Helios could not prepare a safe reflection draft from this conversation. Nothing has been saved.'
      : error.message || 'Helios could not prepare this reflection draft.';
    return res.status(status).json({ success:false, error:{ code:error.code || 'REFLECTION_DRAFT_FAILED', message } });
  }
}
