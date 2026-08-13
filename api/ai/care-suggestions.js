import OpenAI from 'openai';
import { requireAuthenticatedUser, getSupabaseClient } from '../_lib/supabase.js';
import { loadOwnedClientAIContext } from '../_lib/client-ai-context.js';

const PROMPT_VERSION = 'care-suggestions-v2';
const ALLOWED_KINDS = ['current_focus','shared_understanding','trying','change_noticed','learning'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:{ code:'METHOD_NOT_ALLOWED', message:'Method not allowed' } });
  try {
    const { user } = await requireAuthenticatedUser(req);
    const clientId = String(req.body?.clientId || '').trim();
    const input = String(req.body?.input || '').trim();
    const steering = String(req.body?.steering || '').trim();
    const currentCare = Array.isArray(req.body?.currentCare) ? req.body.currentCare.slice(0, 30) : [];

    if (!UUID_PATTERN.test(clientId)) return res.status(400).json({ success:false, error:{ code:'INVALID_CLIENT_ID', message:'Open a valid client before asking Helio for Care suggestions.' } });
    if (!input) return res.status(400).json({ success:false, error:{ code:'INPUT_REQUIRED', message:'Add a thought or observation before asking Helio for suggestions.' } });
    if (input.length > 6000) return res.status(400).json({ success:false, error:{ code:'INPUT_TOO_LONG', message:'Please shorten this reflection before generating suggestions.' } });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ success:false, error:{ code:'SERVICE_UNAVAILABLE', message:'AI suggestions are not configured yet.' } });

    const context = await loadOwnedClientAIContext(getSupabaseClient(), { clientId, userId:user.id });
    if (!context) return res.status(404).json({ success:false, error:{ code:'CLIENT_NOT_FOUND', message:'Client not found.' } });

    const sourceContext = context.sessions.map((s, i) => `Approved session ${i+1}: ${s.content}`).join('\n');
    const careContext = currentCare
      .filter(item => ALLOWED_KINDS.includes(item?.kind) && item?.id && item?.body)
      .map(item => `Care item ${item.id} [${item.kind}]: ${String(item.body).slice(0,1200)}`)
      .join('\n');

    const prompt = `You support a qualified therapist maintaining a gentle CBT-informed Care view. Generate 3-6 discrete possibilities for clinician review. Never diagnose, assert certainty, or imply a suggestion is established fact. Distinguish evidence from clinical inference. Use only the therapist input, approved context, and current clinician-approved Care items supplied below. Suggestions may either ADD a new Care item or UPDATE an existing one when new material meaningfully changes, refines, contradicts, or supersedes it. Never update for cosmetic wording alone. Return JSON only: {"suggestions":[{"kind":"...","body":"...","basis":"therapist_input|approved_record|both","epistemic":"observation|clinical_inference|possible_next_step","action":"add|update","targetItemId":null|string,"reason":"short explanation"}]}. Allowed kinds: ${ALLOWED_KINDS.join(', ')}.\nTherapist input: ${input}\nOptional steering: ${steering || 'none'}\nExisting client focus: ${context.currentFocus || 'none'}\nCurrent clinician-approved Care:\n${careContext || 'none'}\nApproved record context:\n${sourceContext || 'none'}`;

    const openai = new OpenAI({ apiKey:process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({ model:process.env.OPENAI_CARE_MODEL || 'gpt-4o-mini', messages:[{role:'system',content:'Be concise, tentative, clinically respectful, preserve clinician agency, and prefer updating an existing formulation only when the meaning has genuinely evolved.'},{role:'user',content:prompt}], response_format:{type:'json_object'}, temperature:0.4 });
    const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    const validCareIds = new Set(currentCare.map(item => item?.id).filter(Boolean));
    const suggestions = (Array.isArray(parsed.suggestions) ? parsed.suggestions : []).filter(s => ALLOWED_KINDS.includes(s.kind) && String(s.body || '').trim()).slice(0,6).map((s,index)=>{
      const wantsUpdate = s.action === 'update' && validCareIds.has(s.targetItemId);
      return {
        id:`suggestion-${Date.now()}-${index}`,
        kind:s.kind,
        body:String(s.body).trim(),
        basis:['therapist_input','approved_record','both'].includes(s.basis)?s.basis:'therapist_input',
        epistemic:['observation','clinical_inference','possible_next_step'].includes(s.epistemic)?s.epistemic:'clinical_inference',
        action:wantsUpdate?'update':'add',
        targetItemId:wantsUpdate?s.targetItemId:null,
        reason:String(s.reason || '').trim().slice(0,500),
        promptVersion:PROMPT_VERSION
      };
    });
    return res.status(200).json({ success:true, suggestions, contextVersion:context.version, promptVersion:PROMPT_VERSION });
  } catch (error) {
    console.error('[Care suggestions] failed', error.message);
    const status = error.status || 500;
    return res.status(status).json({ success:false, error:{ code:status===401?'UNAUTHORIZED':'CARE_SUGGESTIONS_FAILED', message:status===401?'Please sign in again.':'Helio could not generate suggestions just now. Your note has been kept on screen.' } });
  }
}
