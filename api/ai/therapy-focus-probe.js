// Temporary protected-preview verification. Removed before production merge.
import OpenAI from 'openai';
import { resolveLensConfig } from '../_lib/clinical-lenses.js';
import { buildCareSuggestionsPrompt, buildCareSuggestionsResponseFormat, validateCareSuggestions } from '../_lib/ai-care-suggestions.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'fix/therapy-focus-structured-output' || req.method !== 'GET') return res.status(404).end();
  const sources=Array.from({length:9},(_,i)=>({id:'session:fictional-'+(i+1),occurredAt:'2026-10-'+String(i+1).padStart(2,'0'),sourceType:'transcript_backed_session_summary',reviewStatus:'draft',content:{body:i<5?'Fictional couple described difficulty staying connected during disagreements. One participant reported trying to resolve the other’s discomfort quickly. The other described withdrawing when overwhelmed. The therapist explored these as provisional protective responses, without establishing motives or childhood origins. No agreed aim or improvement was recorded.':'Fictional couple discussed a travel delay. They described requesting specific practical help and being able to stay in contact at a distance. This was an exception to conflict at home, not evidence that their conflict pattern had resolved. They agreed to try a brief body scan. Its outcome is not yet documented.'}}));
  const lensConfig=resolveLensConfig('internal_family_systems');const validSourceIds=new Set(sources.map(s=>s.id));
  try {
    const model=process.env.OPENAI_CARE_MODEL||'gpt-4o-mini';
    const completion=await new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:45000,maxRetries:0}).chat.completions.create({model,messages:[{role:'system',content:'Prepare evidence-grounded provisional Therapy Focus proposals for a qualified therapist.'},{role:'user',content:buildCareSuggestionsPrompt({lensConfig,sourceMode:'history',reviewGoal:'fill_empty',window:'history',historySources:sources})}],response_format:buildCareSuggestionsResponseFormat({allowedKinds:lensConfig.allowedKinds,validSourceIds}),max_tokens:3200,temperature:0.35});
    let invalid=null;const suggestions=validateCareSuggestions(completion.choices?.[0]?.message?.content,{allowedKinds:lensConfig.allowedKinds,validSourceIds,onInvalid:code=>{invalid=code}});
    const success=!!suggestions?.length&&completion.choices?.[0]?.finish_reason==='stop';
    return res.status(success?200:502).json({success,model,sourceCount:sources.length,suggestionCount:suggestions?.length||0,kinds:suggestions?.map(s=>s.kind),finishReason:completion.choices?.[0]?.finish_reason,invalid,inputTokens:completion.usage?.prompt_tokens,outputTokens:completion.usage?.completion_tokens});
  }catch(error){return res.status(502).json({success:false,code:error.code||error.name,status:error.status});}
}
