import { requireAuthenticatedUser } from '../_lib/supabase.js';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const actions = new Set(['reassign', 'detach', 'detach_archive', 'detach_delete', 'flag', 'undo']);

// All relationship changes and impact checks run in the same locked DB transaction.
export function createAssignmentHandler(requireUser = requireAuthenticatedUser) {
return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { supabase, user } = await requireUser(req);
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: { message: 'Method not allowed.' } });
    }
    const input = req.method === 'GET' ? req.query || {} : req.body || {};
    if (!uuid(input.id)) return res.status(400).json({ error: { message: 'Choose a valid transcript.' } });
    const inspect = req.method === 'GET';
    if (!inspect && (!actions.has(input.action) || !uuid(input.sourceVersion) ||
      typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt)) || input.confirmed !== true ||
      (input.action === 'reassign' && !uuid(input.targetClientId)) ||
      (input.targetSessionId != null && !uuid(input.targetSessionId)) ||
      (input.action === 'undo' && !uuid(input.eventId)))) {
      return res.status(400).json({ error: { message: 'Review the change and explicitly confirm it before saving.' } });
    }
    const { data, error } = await supabase.rpc('correct_transcript_assignment', {
      p_user_id: user.id, p_transcript_id: input.id,
      p_action: inspect ? 'inspect' : input.action,
      p_expected_version: inspect ? null : input.sourceVersion,
      p_expected_updated_at: inspect ? null : input.expectedUpdatedAt,
      p_target_client_id: input.action === 'reassign' ? input.targetClientId : null,
      p_target_session_id: input.action === 'reassign' ? input.targetSessionId || null : null,
      p_event_id: input.action === 'undo' ? input.eventId : null
    });
    if (error) {
      const status = error.code === '40001' || error.code === '23514' ? 409 : error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : 503;
      const message = ['40001', '23514', 'P0002'].includes(error.code) ? error.message : 'The correction could not be saved. Nothing changed. Please try again.';
      console.warn('[Transcript assignment]', { code: error.code, status });
      return res.status(status).json({ error: { message, code: error.code } });
    }
    return res.status(200).json({ data });
  } catch (error) {
    return res.status(error.status === 401 ? 401 : 503).json({ error: { message: error.status === 401 ? 'Please sign in again.' : 'The correction is unavailable. Reload to check the current assignment before retrying.' } });
  }
}

}
export default createAssignmentHandler();
