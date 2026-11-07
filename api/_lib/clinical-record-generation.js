import { clinicalRecordResponseProblem, validateClinicalRecordSuggestions } from './clinical-record-evidence.js';

/** Keep usable fields immediately. Retry only an unreadable/invalid envelope. */
export async function generateValidatedClinicalRecordSuggestions({request,sources,focusField=null,run}){
  const first=await run(request);
  const raw=first.completion?.choices?.[0]?.message?.content;
  let checked=validateClinicalRecordSuggestions(raw,sources,focusField);
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
        {role:'user',content:'The response format was invalid. Return exactly {"fields":{...}} with the seven named fields. Each field has text and evidence only. Copy 1-4 exact passages (8-650 characters each) and their supplied source IDs for nonblank text (maximum 1800 characters). If evidence is absent or uncertain, leave that field {"text":"","evidence":[]}. Never infer a negative risk finding from missing information. Do not invent quotes, outcomes, interventions or facts. The original source material remains the only evidence.'}
      ]});
      model=second.model;
      const repaired=second.completion?.choices?.[0]?.message?.content;
      checked=validateClinicalRecordSuggestions(repaired,sources,focusField);
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
