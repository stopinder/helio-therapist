const PRIMARY=new Set(['transcript','session_capture']);
export function verifiedPrimaryConflict(review){return Array.isArray(review?.evidence)&&review.evidence.some(item=>item?.verified===true&&PRIMARY.has(item.sourceType))}
export function hardBoundary(review){return review?.reason==='insufficient_source'||verifiedPrimaryConflict(review)}
export function cautiousSources(sources,review){
 if(!sources?.length||hardBoundary(review))return [];
 const current=sources[0];
 if(!current.original_transcript?.trim() && (review?.requiresManualVerification||review?.evidence?.some(e=>e.sourceId===current.id&&e.sourceType==='zoom_note')))return [];
 return sources.filter((s,i)=>i===0||!!s.original_transcript?.trim()).map(s=>({...s,zoom_generated_summary:s.original_transcript?.trim()?'':s.zoom_generated_summary}));
}
