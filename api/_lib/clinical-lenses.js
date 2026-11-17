// Use the same Therapy Focus choices, category vocabulary and fallback as the UI.
import { getLens } from '../../src/lib/clinicalLenses.js';
import { clientSessionSummaryLensRule } from './ai-client-session-summary.js';
export function resolveLensConfig(id) {
  const lens = getLens(id);
  return { ...lens, aiFraming: lens.aiFraming + '\n' + clientSessionSummaryLensRule(lens.id) + '\nApply this perspective to concise Therapy Focus proposals, not a full report. Only use the allowed Therapy Focus kinds.' };
}
