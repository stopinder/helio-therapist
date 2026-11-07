import { runTextAI } from './ai-execution.js';
import { validateSummaryOutcome } from './summary-outcome.js';
import { assessSummaryDraft, SUMMARY_POLICY_VERSION } from './summary-authoring-policy.js';

/** Review actual ready output. No semantic-accuracy score is claimed.
 * Original sources and the same strict output validator are used for any revision.
 * A source-review outcome is never rewritten merely to improve prose.
 */
export async function reviewSummaryDraft({request, completion, model, structured, validSourceIds, evidenceSources, summaryOptions = {}, run = runTextAI}) {
  const initial = { completion, model, structured };
  const audit = { policyVersion: SUMMARY_POLICY_VERSION, kind: 'mechanical_editorial_checks', revisionAttempted: false, warnings: [] };
  if (structured?.outcome !== 'ready') return { ...initial, qualityReview: audit };
  const issues = assessSummaryDraft(structured, summaryOptions);
  if (!issues.length) return { ...initial, qualityReview: audit };
  audit.revisionAttempted = true;
  let candidate = null;
  try {
    candidate = await run({ ...request,
      promptVersion: `${request.promptVersion}/editorial-review`,
      messages: [...request.messages,
        { role: 'assistant', content: JSON.stringify({outcome:'ready', review:{reason:'',message:'',evidence:[]}, sections:structured.sections, claims:structured.claims}) },
        { role: 'user', content: `Review the draft against the ORIGINAL evidence and the selected audience/addition policy. Correct these writing problems: ${issues.map(item => item.code).join(', ')}. Preserve factual corrections, attribution, uncertainty, every supported material event and the distinction between a wish, agreement and achieved change. Remove only redundant wording or unrequested additions. Do not invent interpretation, links or new recommendations. The prior draft is NOT evidence. Return the same exact JSON contract with grounded claims. A genuine source boundary concern must remain needs_review, never be concealed for a stylistic improvement.` }
      ]
    });
    const revised = validateSummaryOutcome(candidate.completion.choices?.[0]?.message?.content, validSourceIds, evidenceSources);
    if (revised?.outcome === 'needs_review') return { ...candidate, structured: revised, qualityReview: audit };
    if (revised?.outcome === 'ready') {
      const remaining = assessSummaryDraft(revised, summaryOptions);
      if (!remaining.some(issue => issue.blocking) && remaining.length < issues.length) {
        audit.warnings = remaining.map(item => item.message);
        return { ...candidate, structured: revised, qualityReview: audit };
      }
    }
  } catch (error) {
    // No source text, generated prose, account identifiers or external URLs in logs.
    console.warn('[Summary editorial review] Revision unavailable', String(error?.code || error?.name || 'UNAVAILABLE').slice(0,80));
  }
  if (issues.some(item => item.blocking)) {
    throw Object.assign(new Error('The draft contained an unrequested addition or an unchecked link. Your existing draft is unchanged. Review your refinement choices and try again.'), {code:'SUMMARY_ADDITION_NOT_VERIFIED', status:422});
  }
  audit.warnings = issues.map(item => item.message);
  // A style failure never destroys a source-validated draft or triggers a retry loop.
  return { ...initial, qualityReview: audit };
}
