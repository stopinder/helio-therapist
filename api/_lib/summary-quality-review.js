import { runTextAI } from './ai-execution.js';
import { validateSummaryOutcome } from './summary-outcome.js';
import { assessSummaryDraft, SUMMARY_POLICY_VERSION, SUMMARY_EDITORIAL_STANDARD } from './summary-authoring-policy.js';

/** Review actual ready output. No semantic-accuracy score is claimed.
 * Original sources and the same strict output validator are used for any revision.
 * A source-review outcome is never rewritten merely to improve prose.
 */
export async function reviewSummaryDraft({request, completion, model, structured, validSourceIds, evidenceSources, summaryOptions = {}, instructionRequirements = {}, run = runTextAI}) {
  const initial = { completion, model, structured };
  const audit = { policyVersion: SUMMARY_POLICY_VERSION, kind: 'mechanical_editorial_checks', revisionAttempted: false, warnings: [] };
  if (structured?.outcome !== 'ready') return { ...initial, qualityReview: audit };
  const issues = assessSummaryDraft(structured, summaryOptions, instructionRequirements);
  if (!issues.length) return { ...initial, qualityReview: audit };
  audit.revisionAttempted = true;
  let candidate = null;
  try {
    candidate = await run({ ...request,
      promptVersion: `${request.promptVersion}/editorial-review`,
      messages: [...request.messages,
        { role: 'assistant', content: JSON.stringify({outcome:'ready', review:{reason:'',message:'',evidence:[]}, sections:structured.sections, claims:structured.claims}) },
        { role: 'user', content: `Review the draft against the ORIGINAL evidence and the selected audience/addition policy. Correct these writing problems: ${issues.map(item => `${item.code}: ${item.message}`).join(' ')}. Shared writing standard: ${SUMMARY_EDITORIAL_STANDARD} Required deliverables: ${JSON.stringify(instructionRequirements)}. When an exercise is requested, put its numbered steps in betweenSession under a separate Optional exercise to consider heading; when eightPoint=true include all steps 1-8; when somaticCheckIn=true add a separately titled actionable Somatic check-in with body-attention guidance while partners interact. Do not substitute a description, promise, or list of body parts. Include a gentle opt-out. Preserve factual corrections, attribution, uncertainty, every supported material event and the distinction between a wish, agreement and achieved change. Retain brief, source-grounded recognition of genuine effort, awareness, care or insight where therapeutically useful; it is not disposable filler. Remove redundant wording and unrequested additions, not meaningful empathic recognition. Never add automatic praise or invent improvement. Do not invent interpretation, links or new recommendations. The prior draft is NOT evidence. Return the same exact JSON contract with grounded claims. A genuine source boundary concern must remain needs_review, never be concealed for a stylistic improvement.` }
      ]
    });
    const revised = validateSummaryOutcome(candidate.completion.choices?.[0]?.message?.content, validSourceIds, evidenceSources);
    if (revised?.outcome === 'needs_review') return { ...candidate, structured: revised, qualityReview: audit };
    if (revised?.outcome === 'ready') {
      const remaining = assessSummaryDraft(revised, summaryOptions, instructionRequirements);
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
    throw Object.assign(new Error('The draft did not satisfy a required therapist instruction or contained an unverified addition. Your existing draft is unchanged. Review the instruction and try again.'), {code:'SUMMARY_ADDITION_NOT_VERIFIED', status:422});
  }
  audit.warnings = issues.map(item => item.message);
  // A style failure never destroys a source-validated draft or triggers a retry loop.
  return { ...initial, qualityReview: audit };
}
