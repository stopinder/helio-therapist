const labels = Object.freeze({
  presentingConcerns:'Presenting concerns',sessionThemes:'Session themes',
  interventionsUsed:'Interventions used',clientResponse:'Client response',
  riskSafeguarding:'Risk and safeguarding',progressGoals:'Progress toward goals',planNextSession:'Plan for next session'
});
export const clinicalRecordFieldLabels = labels;

/** A focused retry updates just that field; no draft text is ever passed here. */
export function mergeClinicalRecordSuggestionResult(previous,incoming,focusField=null){
  if(!previous || !focusField || !Object.hasOwn(labels,focusField))return incoming;
  if(previous.clientId!==incoming.clientId || previous.sessionId!==incoming.sessionId)return incoming;
  const fields={...previous.fields,[focusField]:incoming.fields[focusField]};
  const fieldResults={...previous.fieldResults,[focusField]:incoming.fieldResults?.[focusField]};
  const sources=new Map((incoming.sources||[]).map(source=>[source.id,source]));
  // Keep other suggestions only while their evidence metadata still matches the
  // refreshed, server-scoped sources. Do not revive removed/reassigned sources.
  for(const key of Object.keys(labels)){
    if(key===focusField || !fields[key]?.text)continue;
    const current=fields[key].evidence?.length && fields[key].evidence.every(ref=>{
      const source=sources.get(ref.sourceId);
      return source && ['recordId','updatedAt','kind','reviewStatus'].every(name=>(source[name]??null)===(ref[name]??null));
    });
    if(!current){
      fields[key]={text:'',evidence:[]};
      fieldResults[key]={state:'withheld',code:'SOURCE_CHANGED',message:'The supporting record changed or is no longer in this request. Refresh this field before using it.'};
    }
  }
  const issues=Object.entries(fieldResults).filter(([,result])=>result?.state==='withheld')
    .map(([field,result])=>({field,label:labels[field],code:result.code,message:result.message}));
  const supportedFieldCount=Object.values(fields).filter(field=>field?.text).length;
  return {...incoming,fields,fieldResults,issues,supportedFieldCount,
    outcome:supportedFieldCount?(issues.length?'partial':'ready'):'insufficient_evidence'};
}
