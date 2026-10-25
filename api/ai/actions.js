import { requireAuthenticatedUser, getSupabaseUserClient } from '../_lib/supabase.js';

// A deliberate, human-confirmed write boundary. There are no model-supplied
// arbitrary actions, external recipients, client mutations or auto-sends.
export function validateHeliosAction({ type, body, confirmed } = {}) {
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
    const table = action.type === 'create_reminder' ? 'therapist_reminders' : 'private_reflections';
    const fields = action.type === 'create_reminder'
      ? { therapist_id: user.id, body: action.body }
      : { user_id: user.id, client_id: null, body: action.body, theme: 'Ask Helios reflective note' };
    const { data, error } = await db.from(table).insert(fields).select('id').single();
    if (error || !data) throw new Error('Approved action was not saved');
    return res.status(201).json({ success: true, id: data.id, action: action.type });
  } catch (error) {
    const status = error.status === 401 ? 401 : 503;
    return res.status(status).json({ success: false, error: status === 401 ? 'Authentication required' : 'Unable to save approved action' });
  }
}
