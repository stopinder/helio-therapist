const PRIMARY=new Set(['transcript','session_capture']);
export function verifiedPrimaryConflict(review){return Array.isArray(review?.evidence)&&review.evidence.some(item=>item?.verified===true&&PRIMARY.has(item.sourceType))}
export function repeatsConfirmedPrimaryEvidence(sources, review) {
  if (review?.reason === 'insufficient_source' || !verifiedPrimaryConflict(review)) return false;
  return review.evidence.filter(item => item.verified === true && PRIMARY.has(item.sourceType)).every(item => {
    const source = sources.find(candidate => candidate.id === item.sourceId);
    const confirmation = source?.source_review;
    return confirmation?.state === 'confirmed' && Array.isArray(confirmation.evidence) &&
      confirmation.evidence.some(previous => previous?.verified === true &&
        previous.sourceId === item.sourceId && previous.sourceType === item.sourceType &&
        previous.quote === item.quote && previous.startLine === item.startLine && previous.endLine === item.endLine);
  });
}
export function hardBoundary(review){return review?.reason==='insufficient_source'||verifiedPrimaryConflict(review)}
// Retain only a confirmed, single-encounter, transcript-only draft. A draft
// which also used a secondary note or continuity needs its normal review path.
export function canRetainConfirmedTranscriptDraft(sources, review) {
 const current=sources?.[0];
 return sources?.length===1 && current?.source_review?.state==='confirmed' && !!current.original_transcript?.trim() &&
   !current.zoom_generated_summary?.trim() &&
   (!hardBoundary(review) || repeatsConfirmedPrimaryEvidence(sources,review));
}
export function cautiousSources(sources,review){
 if (!sources?.length || (hardBoundary(review) && !repeatsConfirmedPrimaryEvidence(sources, review))) return [];
 const current=sources[0];
 const currentNoteConflict = review?.evidence?.some(item =>
   item.verified === true && item.sourceId === current.id && item.sourceType === 'zoom_note');
 if (!current.original_transcript?.trim() &&
     (currentNoteConflict || (review?.requiresManualVerification && current.source_review?.state !== 'confirmed'))) return [];
 return sources.filter((s,i)=>i===0||!!s.original_transcript?.trim()).map(s=>({...s,zoom_generated_summary:s.original_transcript?.trim()?'':s.zoom_generated_summary}));
}
