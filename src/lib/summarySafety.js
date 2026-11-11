/** Shared browser/server boundary: an operational notice is not clinical evidence. */
export function isSummaryReviewNotice(value) {
  const text = typeof value === 'string' ? value : '';
  return /(?:please\s+)?confirm\s+which\s+client(?:\s+conversation)?/i.test(text)
    || /(?:recording|transcript|source)\s+(?:appears?\s+to\s+)?(?:contain|include)s?\s+(?:two|multiple|several)\s+(?:distinct\s+|separate\s+)?client\s+(?:conversations|sessions|appointments)/i.test(text)
    || /(?:prepare|create)\s+separate\s+summaries\s+to\s+protect\s+confidentiality/i.test(text)
    || /(?:separated|split)\s+and\s+reviewed\s+before\s+(?:any\s+)?client-facing\s+summary/i.test(text);
}
export function isUnusableSummary(content) {
  if (!content || typeof content !== 'object') return false;
  if (content.visibility === 'therapist_only' || content.mode === 'therapist_formulation' || content.summaryGeneration?.mode === 'therapist_formulation' || content.clinicalIntelligence?.generation?.mode === 'therapist_formulation') return true;
  const outcome = content.summaryGeneration?.outcome || content.clinicalIntelligence?.generation?.outcome || content.generationOutcome;
  return Boolean((outcome && outcome !== 'ready') || content.sourceReview?.state === 'needs_review' || isSummaryReviewNotice(content.body));
}
export function assertUsableSummaryResult(result) {
  if (result?.outcome === 'needs_review') {
    const error = new Error('Review the source before generating a summary. Your previous draft is unchanged.');
    error.code = 'SOURCE_REVIEW_REQUIRED'; error.review = result.review; throw error;
  }
  if (result?.outcome !== 'ready' || typeof result?.draft?.body !== 'string' || !result.draft.body.trim() || isSummaryReviewNotice(result.draft.body)) {
    const error = new Error('No usable summary was returned. Your previous draft is unchanged.');
    error.code = 'INVALID_SUMMARY_OUTCOME'; throw error;
  }
  return result;
}

export function assertClientDocumentContent(content) {
  if (content?.mode === 'therapist_formulation' || content?.visibility === 'therapist_only' || content?.formulation?.visibility === 'therapist_only' || content?.summaryGeneration?.mode === 'therapist_formulation' || content?.clinicalIntelligence?.generation?.mode === 'therapist_formulation') {
    throw Object.assign(new Error('Private working formulations cannot be saved as client documents.'), {code:'PRIVATE_FORMULATION_NOT_CLIENT_DOCUMENT'});
  }
  return content;
}
