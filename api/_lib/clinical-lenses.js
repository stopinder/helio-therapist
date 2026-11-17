// Therapy Focus uses its own concise formulation contract, not session-document headings.
import { getLens } from '../../src/lib/clinicalLenses.js';
const focusRules = {
  clinical: 'Use a formal, provisional clinical formulation: presenting difficulties, relevant context, maintaining and protective factors, documented interventions and response, and assessment limits. Attribute observations and hypotheses. Do not imply a diagnostic assessment has taken place.',
  integrative: 'Connect the documented relational, emotional, behavioural and contextual threads. Distinguish the client’s priorities, provisional understanding, actual work, observed change and learning.',
  gentle_cbt: 'Use a collaborative CBT formulation: specific situations, appraisals, emotions, bodily responses and behaviours, maintaining cycles, documented behavioural experiments and their outcomes. Do not invent beliefs, homework or improvement.',
  ifs: 'Use IFS distinctions where supported: inner positions, protective responses, possible protective intentions, and evidence of curiosity, unblending or greater choice. Protective intentions are hypotheses unless explicitly reported. Do not infer exiles, trauma histories, Self access or internal change from ordinary emotional descriptions.',
  ta: 'Use Transactional Analysis concepts where supported: transactions, ego-state responses, recurring relational sequences and explicitly explored scripts or permissions. Do not impose ego-state labels, games or script beliefs as established facts.'
};
export function resolveLensConfig(id) {
  const lens = getLens(id);
  return { ...lens, aiFraming: lens.aiFraming + '\n' + (focusRules[lens.id] || focusRules.integrative) + '\nApply this perspective to concise Therapy Focus proposals, not a full report. Only use the allowed Therapy Focus kinds.' };
}
