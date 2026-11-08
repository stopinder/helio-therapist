import { clinicalRecordResponseProblem, validateClinicalRecordSuggestions, materializeClinicalRecordPassages } from './clinical-record-evidence.js';

/** Keep usable fields immediately. Retry only an unreadable/invalid envelope. */
export async function generateValidatedClinicalRecordSuggestions({request,sources,passages=null,focusField=null,run}){
  const first=await run(request);
  const raw=first.completion?.choices?.[0]?.message?.content;
  const validate=content=>validateClinicalRecordSuggestions(
    Array.isArray(passages)?materializeClinicalRecordPassages(content,passages):content,
    sources,focusField
  );
  let checked=validate(raw);
  let model=first.model;
  let attempts=1;
  let problem=clinicalRecordResponseProblem(raw);
  if(checked)return {checked,model,attempts,problem:null};
  if(first.completion?.choices?.[0]?.finish_reason==='stop'){
    // One constrained repair for format failures only. Do not replay rejected
    // model prose as a new source; the original scoped sources remain unchanged.
    console.warn('[Clinical record suggestions] Response format failed; one constrained repair');
    try{
      attempts=2;
      const second=await run({...request,messages:[
        ...request.messages,
        {role:'user',content:Array.isArray(passages)
          ? 'The response format was invalid. Return exactly {"fields":{...}} with the seven named fields. Each field has text and evidence only. Cite 1-4 permitted passageId values from the supplied passage list for nonblank text (maximum 1800 characters); never write your own quotes or source IDs. If relevant passages are absent, return {"text":"","evidence":[]}. Do not infer risk status, interventions or outcomes.'
          : 'The response format was invalid. Return exactly {"fields":{...}} with the seven named fields. Each field has text and evidence only. Copy 1-4 exact passages and their source IDs for nonblank text (maximum 1800 characters). If evidence is absent or uncertain, leave that field {"text":"","evidence":[]}. Never infer risk status, interventions or outcomes.'}
      ]});
      model=second.model;
      const repaired=second.completion?.choices?.[0]?.message?.content;
      checked=validate(repaired);
      problem=clinicalRecordResponseProblem(repaired);
    }catch(error){
      // Diagnostics never include model output, source passages or provider messages.
      console.warn('[Clinical record suggestions] Response-format repair unavailable');
    }
  }
  return {checked,model,attempts,problem:checked?null:(problem||{
    code:'INVALID_RESPONSE',message:'The response could not be checked against the permitted source set. No suggestions were used.'
  })};
}
