import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';
import { ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION } from '../_lib/ask-helios-reflection-draft.js';

const REFLECTION_KEYS = ['stoodOut','emotionalResponse','countertransference','uncertainties','supervisionQuestions','nextSession'];
const MAP_KEYS = ['innerPosition','protectiveIntention','trigger','impact','spaceCreated','supervisionQuestion'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function cleanText(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function cleanFields(source, keys, max) {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  return Object.fromEntries(keys.map(key => [key, cleanText(value[key], max)]));
}

// A deliberate, human-confirmed write boundary. There are no model-supplied
// arbitrary actions, external recipients, client mutations or auto-sends.
export function validateHeliosAction({ type, body, confirmed, reflection, reflectiveMap, theme, sourceConversationId } = {}) {
  if (confirmed !== true || typeof body !== 'string') return null;
  const trimmed = body.trim();
  if (type === 'create_reminder' && trimmed.length >= 3 && trimmed.length <= 300) {
    return { type, body: trimmed };
  }
  // A therapist must choose and edit the exact text they want to save.
  // The record is private professional reflection, never a client record.
  if (type === 'save_private_reflection' && trimmed.length >= 10 && trimmed.length <= 4000) {
    return { type, body: trimmed };
  }
  if (type === 'save_private_reflection_draft' && UUID_PATTERN.test(String(sourceConversationId || ''))) {
    const reviewedReflection = cleanFields(reflection, REFLECTION_KEYS, 1400);
    const reviewedMap = cleanFields(reflectiveMap, MAP_KEYS, 1000);
    const reviewedTheme = cleanText(theme, 120);
    const bodyText = REFLECTION_KEYS.map(key => reviewedReflection[key]).filter(Boolean).join('\n\n');
    if (bodyText.length >= 10 && bodyText.length <= 8000) {
      return {
        type,
        body: bodyText,
        reflection: reviewedReflection,
        reflectiveMap: reviewedMap,
        theme: reviewedTheme,
        sourceConversationId: String(sourceConversationId)
      };
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const { user } = await requireAuthenticatedUser(req);
    const action = validateHeliosAction(req.body);
    if (!action) {
      return res.status(400).json({ success: false, error: 'Select a supported action, edit the text and confirm.' });
    }
    const db = getSupabaseUserClient(req);
    if (action.type === 'save_private_reflection_draft') {
      const { data: conversation, error: conversationError } = await db
        .from('ask_helios_conversations')
        .select('id,title')
        .eq('id', action.sourceConversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (conversationError || !conversation || !(conversation.title?.startsWith('[Reflect]') || conversation.title?.startsWith('[Workspace]'))) {
        return res.status(400).json({ success:false, error:'The source Ask Helios conversation is no longer available.' });
      }
    }
    const table = action.type === 'create_reminder' ? 'therapist_reminders' : 'private_reflections';
    const fields = action.type === 'create_reminder'
      ? { therapist_id: user.id, body: action.body }
      : action.type === 'save_private_reflection_draft'
        ? {
            user_id: user.id,
            client_id: null,
            body: action.body,
            ...(action.theme ? { theme: action.theme } : {}),
            workspace_content: {
              ...action.reflection,
              reflectiveMap: action.reflectiveMap,
              captureSource: 'ask_helios',
              askHelios: {
                conversationId: action.sourceConversationId,
                promptVersion: ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION
              }
            }
          }
        : { user_id: user.id, client_id: null, body: action.body, theme: 'Ask Helios reflective note' };
    const { data, error } = await db.from(table).insert(fields).select('id').single();
    if (error || !data) throw new Error('Approved action was not saved');
    return res.status(201).json({ success: true, id: data.id, action: action.type });
  } catch (error) {
    const status = error.status === 401 ? 401 : 503;
    return res.status(status).json({ success: false, error: status === 401 ? 'Authentication required' : 'Unable to save approved action' });
  }
}
