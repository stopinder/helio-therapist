import { SUMMARY_HEADINGS } from './summaryAuthoring.js';

/** Derivative summaries may contain optional future suggestions. Never reuse those
 * as evidence of interventions performed, progress achieved or plans agreed.
 * This only prepares a source view; the original saved document stays unchanged.
 */
export function summaryClinicalEvidence(body) {
  const lines=[];let proposal=false;
  for(const line of String(body||'').split(/\r?\n/)) {
    const heading=line.trim().replace(/^#{1,3}\s+/,'').replace(/:$/,'');
    if(/^Optional (?:exercise|practice|resource)(?:\s+to\s+(?:consider|try))?(?:\s*[:(]|$)/i.test(heading)) {proposal=true;continue;}
    if(proposal && SUMMARY_HEADINGS.has(heading) && !/^(?:Optional |Somatic check-in)/i.test(heading))proposal=false;
    if(!proposal)lines.push(line);
  }
  return lines.join('\n').trim();
}
