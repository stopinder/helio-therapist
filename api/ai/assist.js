import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { answerWorkspaceQuestion } from '../_lib/ask-helios-workspace.js';
import { loadOwnedWorkspaceContext } from '../_lib/ask-helios-context.js';
import { ASK_HELIOS_CLINICAL_LENSES, ASK_HELIOS_CLINICAL_PROMPT_VERSION, ASK_HELIOS_CLINICAL_WINDOWS, askHeliosClinicalResponseFormat, askHeliosClinicalSystemPrompt, buildAskHeliosClinicalInput, loadAskHeliosClinicalContext, renderAskHeliosClinicalAnswer } from '../_lib/ask-helios-clinical.js';

const MODES = Object.freeze({ workspace: 'Workspace', reflect: 'Reflect' });
const REFLECT_PROMPT_VERSION = 'ask-helios-reflect/1.0.0';
const REFLECT_SYSTEM = [
  'You are Ask Helios in Reflect mode, an exploratory writing partner for qualified therapists.',
  'Help therapists reflect with careful, open questions and consider multiple possible perspectives.',
  'Do not diagnose, assert a formulation about a client, or impersonate a clinical supervisor.',
  'Distinguish an observation recorded by the therapist from an inference, and acknowledge uncertainty.',
  'Do not claim access to client records, research papers, calendars, or supervision notes.',
  'Do not recommend automated clinical decisions. The therapist retains responsibility.',
  'Encourage removing direct client identifiers from reflective chat.',
  'Never automatically record reflections in a client file or supervision report.',
  'Keep answers useful and concise, normally two to four paragraphs with one thoughtful question.'
].join(' ');

function safeHistory(value) {
  return (Array.isArray(value) ? value : []).slice(-6)
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .map(item => ({ role: item.role, content: item.content.slice(0, 450) }));
}

async function saveConversation(db, userId, mode, query, answer, references, existingId) {
  let id = existingId || null;
  if (id) {
    const { data, error } = await db.from('ask_helios_conversations')
      .select('id,title').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error || !data) {
      const forbidden = new Error('Conversation not found for this account');
      forbidden.status = 404; throw forbidden;
    }
    if (!data.title.startsWith('[' + MODES[mode] + ']')) {
      const conflict = new Error('Start a new conversation when changing modes');
      conflict.status = 409; throw conflict;
    }
  } else {
    const { data, error } = await db.from('ask_helios_conversations')
      .insert({ user_id: userId, title: '[' + MODES[mode] + '] ' + query.slice(0, 65) })
      .select('id').single();
    if (error || !data) throw new Error('Unable to start conversation');
    id = data.id;
  }
  const { error } = await db.from('ask_helios_messages').insert([
    { conversation_id: id, user_id: userId, role: 'user', content: query },
    { conversation_id: id, user_id: userId, role: 'assistant', content: answer, citation_metadata: references }
  ]);
  if (error) throw new Error('Unable to save conversation messages');
  return id;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseUserClient(req);
    const mode = req.body?.mode;
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const clientId = req.body?.clientId || null;
    const clinicalContext = req.body?.clinicalContext && typeof req.body.clinicalContext === 'object' ? req.body.clinicalContext : null;
    const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : null;
    if (!Object.hasOwn(MODES, mode) || !query || query.length > 1200) {
      return res.status(400).json({
        success: false, error: { message: 'Choose a supported mode and provide a question of up to 1,200 characters.' }
      });
    }
    // Validate the conversation before any metered AI call. Cross-mode and
    // cross-therapist IDs never spend a Free AI allowance.
    if (conversationId) {
      const { data, error } = await db.from('ask_helios_conversations').select('id,title')
        .eq('id', conversationId).eq('user_id', user.id).maybeSingle();
      if (error || !data || !data.title.startsWith('[' + MODES[mode] + ']')) {
        return res.status(409).json({ success: false, error: { message: 'Start a new conversation in this mode.' } });
      }
    }

    // Recover task state from owned server-side history, not caller-provided
    // documentSearch. This survives refresh and prevents forged client filters.
    let priorWorkspaceContext = null;
    if (mode === 'workspace' && conversationId) {
      priorWorkspaceContext = await loadOwnedWorkspaceContext(db, user.id, conversationId);
    }
    let answer, references = [], proposedAction = null, documentSearch = null;
    let clinicalResponseContext = null;
    if (mode === 'workspace') {
      if (clinicalContext) {
        const clinicalClientId = typeof clinicalContext.clientId === 'string' ? clinicalContext.clientId : '';
        const anchorSessionId = typeof clinicalContext.anchorSessionId === 'string' ? clinicalContext.anchorSessionId : null;
        const window = ASK_HELIOS_CLINICAL_WINDOWS.includes(clinicalContext.window) ? clinicalContext.window : 'last_three';
        const lens = ASK_HELIOS_CLINICAL_LENSES.includes(clinicalContext.lens) ? clinicalContext.lens : 'integrative';
        if (!clinicalClientId || (clientId && clientId !== clinicalClientId)) {
          return res.status(400).json({ success:false, error:{ message:'Reopen Ask Helios from the client or session you want to discuss.' } });
        }
        const context = await loadAskHeliosClinicalContext({
          supabase: db, userId: user.id, clientId: clinicalClientId, anchorSessionId, window
        });
        const { completion } = await runTextAI({
          feature: AI_FEATURES.ASK_HELIOS_RESEARCH,
          userId: user.id,
          promptVersion: ASK_HELIOS_CLINICAL_PROMPT_VERSION,
          messages: [
            { role:'system', content: askHeliosClinicalSystemPrompt(lens) },
            ...safeHistory(req.body?.history),
            { role:'user', content: buildAskHeliosClinicalInput({ query, lens, context }) }
          ],
          responseFormat: askHeliosClinicalResponseFormat(),
          temperature: 0.25,
          maxTokens: 1800,
          timeout: 60000
        });
        let structured;
        try { structured = JSON.parse(completion.choices?.[0]?.message?.content || '{}'); }
        catch { structured = null; }
        if (!structured?.recordedContext || !structured?.clinicalInterpretation) {
          const failure = new Error('Clinical reasoning did not return a usable answer.'); failure.status = 502; throw failure;
        }
        answer = renderAskHeliosClinicalAnswer(structured);
        references = context.references;
        const deidentifiedQuery = context.client.displayName
          ? query.split(context.client.displayName).join('this clinical presentation')
          : query;
        clinicalResponseContext = {
          clientId: context.client.id,
          clientName: context.client.displayName,
          anchorSessionId: context.anchorSessionId,
          window,
          lens,
          sourceCount: context.sourceCount,
          researchHandoff: 'Find published research relevant to this therapist question: ' + deidentifiedQuery
        };
      } else {
        const result = await answerWorkspaceQuestion({
          supabase: db, userId: user.id, query, clientId,
          documentSearch: priorWorkspaceContext
        });
        answer = result.answer;
        references = result.references;
        proposedAction = result.proposedAction;
        documentSearch = result.documentSearch || null;
      }
    } else {
      // The established Ask Helios quota feature covers all AI-generating Ask
      // Helios modes for now. The promptVersion distinguishes Reflect usage.
      // No client records are loaded or injected into this request.
      const { completion } = await runTextAI({
        feature: AI_FEATURES.ASK_HELIOS_RESEARCH,
        userId: user.id,
        promptVersion: REFLECT_PROMPT_VERSION,
        messages: [
          { role: 'system', content: REFLECT_SYSTEM },
          ...safeHistory(req.body?.history),
          { role: 'user', content: query }
        ],
        temperature: 0.35,
        maxTokens: 650
      });
      answer = String(completion.choices?.[0]?.message?.content || '').trim();
      if (!answer) throw new Error('Reflect mode did not return an answer');
    }

    let saved = true, activeId = conversationId;
    try {
      activeId = await saveConversation(db, user.id, mode, query, answer, references, conversationId);
    } catch (error) {
      saved = false;
      console.error('[Ask Helios Assist] persistence unavailable', error.message);
    }
    return res.status(200).json({
      success: true, mode, answer, references, conversationId: activeId,
      saved, proposedAction, documentSearch,
      ...(clinicalResponseContext ? { clinicalContext: clinicalResponseContext } : {}),
      ...(saved ? {} : { warning: 'Answer displayed but conversation could not be saved. Copy anything you wish to keep.' })
    });
  } catch (error) {
    const status = [400, 401, 404, 409, 413, 429, 502, 503].includes(error.status) ? error.status : 500;
    console.error('[Ask Helios Assist] request failed', error.code || status);
    const message = error.code === 'DOCUMENT_CONTEXT_REQUIRED' ? error.message
      : status === 401 ? 'Please sign in again.'
      : status === 404 ? 'That client is not accessible in your workspace.'
      : status === 400 ? error.message
      : status === 502 ? 'Ask Helios could not complete the clinical reasoning response.'
      : status === 503 ? 'Workspace information is temporarily unavailable.'
      : status === 413 || status === 429 ? 'The AI allowance or request limit has been reached.'
      : 'Ask Helios could not answer right now.';
    return res.status(status).json({ success: false, error: { message, code: error.code || 'ASSIST_FAILED' } });
  }
}
