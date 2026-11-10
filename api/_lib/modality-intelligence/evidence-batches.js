import { failure } from './contracts.js';

// Explicit service ceilings, not a licence to drop the tail of a transcript.
// Each batch is smaller than the old single-pass input; larger windows are
// covered by multiple calls sharing the one authenticated workflow permit.
export const MAX_WINDOW_SOURCE_CHARS = 600000;
export const MAX_BATCH_SOURCE_CHARS = 100000;
export const MAX_BATCH_JSON_CHARS = 135000;
export const MAX_EVIDENCE_BATCHES = 8;
export const MAX_BATCH_OBSERVATIONS = 9;
const OVERLAP = 500;

export function evidenceSizeError() {
  return failure('EVIDENCE_WINDOW_TOO_LARGE',
    'This selection exceeds the bounded multi-session review capacity. Adjust the evidence window and generate again. No source text has been dropped and your current draft is unchanged.', 413);
}

/** Split only at source boundaries or overlapping text ranges. The source id,
 * encounter and date never change. No summaries replace selected originals.
 * All ranges are retained so tests/audit can establish complete coverage.
 */
export function planEvidenceBatches(sources) {
  if (!Array.isArray(sources) || !sources.length) throw failure('NO_SOURCE_MATERIAL','No selected source material is available.',409);
  if (new Set(sources.map(source=>source.id)).size !== sources.length) throw failure('DUPLICATE_SOURCE_ID','The evidence contains ambiguous source identifiers.');
  const sourceChars = sources.reduce((sum,source)=>sum+String(source.text||'').length,0);
  if (sourceChars > MAX_WINDOW_SOURCE_CHARS) throw evidenceSizeError();
  const batches = [];
  let current = [], chars = 0;
  const flush = () => {
    if (!current.length) return;
    batches.push({ sources:current, sourceChars:chars });
    current=[]; chars=0;
    if (batches.length > MAX_EVIDENCE_BATCHES) throw evidenceSizeError();
  };
  for (const source of sources) {
    const text=String(source.text||'');
    if (!text.trim()) continue;
    let start=0;
    while(start<text.length) {
      let end=Math.min(text.length,start+MAX_BATCH_SOURCE_CHARS);
      // Prefer a complete turn or paragraph; overlap supplies boundary context.
      if(end<text.length) {
        const newline=text.lastIndexOf('\n',end);
        if(newline>start+MAX_BATCH_SOURCE_CHARS*0.75)end=newline+1;
        if(/[\uD800-\uDBFF]/.test(text[end-1]))end--;
      }
      let part={...source,text:text.slice(start,end),range:{start,end,totalChars:text.length}};
      // Serialization can amplify escaped or control characters. Bound it too.
      while(JSON.stringify([part]).length>MAX_BATCH_JSON_CHARS && end-start>1000) {
        end=start+Math.floor((end-start)*0.8);
        if(/[\uD800-\uDBFF]/.test(text[end-1]))end--;
        part={...source,text:text.slice(start,end),range:{start,end,totalChars:text.length}};
      }
      if(JSON.stringify([part]).length>MAX_BATCH_JSON_CHARS)throw evidenceSizeError();
      if(current.some(item=>item.id===part.id) || chars+part.text.length>MAX_BATCH_SOURCE_CHARS || JSON.stringify([...current,part]).length>MAX_BATCH_JSON_CHARS)flush();
      current.push(part); chars+=part.text.length;
      if(end===text.length)break;
      flush();
      start=Math.max(start+1,end-OVERLAP);
      if(/[\uDC00-\uDFFF]/.test(text[start]))start--;
    }
  }
  flush();
  if(!batches.length)throw failure('NO_SOURCE_MATERIAL','No selected source material is available.',409);
  return {batches,sourceChars,sourceCount:sources.length,coverage:batches.flatMap((batch,index)=>batch.sources.map(source=>({sourceId:source.id,encounterId:source.encounterId||null,batch:index+1,...source.range})))};
}

export function modalityWorkflowLimits(plan,mode) {
  const count=plan.batches.length;
  if(count===1)return {maxCalls:mode==='therapist_formulation'?2:4,maxInputChars:500000,maxOutputTokens:16500};
  return {
    maxCalls:count+1+(mode==='therapist_formulation'?1:3),
    maxInputChars:1500000,
    maxOutputTokens:count*2400+1200+3000+(mode==='therapist_formulation'?0:10000)
  };
}
