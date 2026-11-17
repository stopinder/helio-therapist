// Synthetic comparison only. Does not access accounts or real clinical records.
// Default: validate identical model inputs. --live: call the configured model.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { ACROSS_SESSION_REVIEW_FIXTURE as fixture } from '../test/fixtures/across-session-review.js';
import { CLIENT_SESSION_SUMMARY_LENSES, CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, clientAcrossSessionReviewSystemPrompt, clientSessionSummaryResponseFormat, normalizeClientSessionSummaryResponse, validateClientSessionSummaryResponse, renderClientSessionSummary } from '../api/_lib/ai-client-session-summary.js';
import { buildTemperatureParams, buildTokenLimitParams } from '../api/_lib/ai-execution.js';
import { parseSummaryBlocks, ACROSS_SESSION_SECTION_GROUPS } from '../src/lib/summaryAuthoring.js';
import { summaryLensSectionGroups } from '../src/lib/summaryLenses.js';
const live = process.argv.includes('--live');
const model = process.env.OPENAI_CLIENT_SUMMARY_MODEL || 'gpt-5.6-terra';
if (live && !process.env.OPENAI_API_KEY) throw new Error('Live comparison requires a configured OPENAI_API_KEY. No model comparison was run.');
const openai = live ? new OpenAI({ timeout: 60000 }) : null;
const ids = new Set(fixture.captures.map(s => 'session:' + s.sessionId));
let firstEvidence;
const results = [];
for (const lens of CLIENT_SESSION_SUMMARY_LENSES) {
  const input = JSON.parse(buildClientSessionSummaryInput({ ...fixture, lens }));
  const evidence = JSON.stringify({ evidenceMap: input.evidenceMap, comparisonFrame: input.comparisonFrame });
  if (firstEvidence) assert.equal(evidence, firstEvidence, 'Every lens must receive exactly the same session evidence');
  firstEvidence = evidence;
  const result = { lens, evidenceHash: createHash('sha256').update(evidence).digest('hex'), sessionCount: input.comparisonFrame.sessions.length, headings: summaryLensSectionGroups(lens, 'across_session_review', ACROSS_SESSION_SECTION_GROUPS).map(g => g.heading) };
  if (live) {
    const response = await openai.chat.completions.create({ model, messages: [
      { role: 'system', content: clientAcrossSessionReviewSystemPrompt(lens, fixture.summaryOptions) },
      { role: 'user', content: JSON.stringify(input) }
    ], response_format: clientSessionSummaryResponseFormat(ids), ...buildTemperatureParams(model, 0.2), ...buildTokenLimitParams(model, 8000) });
    assert.notEqual(response.choices?.[0]?.finish_reason, 'length', 'Truncated output is not a usable comparison');
    const structured = validateClientSessionSummaryResponse(normalizeClientSessionSummaryResponse(response.choices?.[0]?.message?.content), ids);
    assert.ok(structured, lens + ': invalid response or provenance');
    for (const claim of structured.claims) if (['recurring', 'explicit_change'].includes(claim.evidenceStrength)) {
      assert.ok(new Set(claim.sourceIds.filter(id => id.startsWith('session:'))).size >= 2, lens + ': longitudinal claim lacks independent session evidence');
    }
    result.body = renderClientSessionSummary(structured.sections, lens, 'across_session_review');
    result.visibleHeadings = parseSummaryBlocks(result.body).filter(b => b.type === 'heading').map(b => b.content);
    result.claims = structured.claims;
  }
  results.push(result);
}
console.log(JSON.stringify({ promptVersion: CLIENT_SESSION_SUMMARY_PROMPT_VERSION, mode: live ? 'live-model-synthetic-comparison' : 'offline-input-and-heading-comparison', model: live ? model : null, clinicalQualityVerified: false, reviewRequired: ['Are recurring claims supported by independent dated encounters?', 'Is the latest incident used as a comparison rather than the whole review?', 'Are change, one-off exception and unknown outcome kept distinct?', 'Does each lens use its own formulation rather than just different labels?', 'Are each partner’s reports and hypotheses attributed fairly?', 'Does Clinical state assessment limits without inventing diagnoses or risk findings?', 'Are next steps actually discussed or explicitly requested?'], results }, null, 2));
