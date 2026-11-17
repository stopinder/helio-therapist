import { SUMMARY_LENS_IDS, SUMMARY_LENS_LABELS, normalizeSummaryLens } from './summaryLenses.js';

// One persisted vocabulary for Therapy Focus; a perspective changes interpretation
// and display labels, never whether an existing entry is visible.
export const THERAPY_FOCUS_KINDS = Object.freeze(['current_focus', 'shared_understanding', 'trying', 'change_noticed', 'learning']);
export const LEGACY_FOCUS_KINDS = Object.freeze({ narrative: 'shared_understanding', themes: 'shared_understanding', interventions: 'trying', outcomes: 'change_noticed' });
export function canonicalFocusKind(kind) { return LEGACY_FOCUS_KINDS[kind] || kind; }
const headings = {
  clinical: ['Presenting difficulties and priorities', 'Provisional clinical formulation', 'Plan and interventions', 'Clinical course and response', 'Assessment limits and learning'],
  integrative: ['Aims and objectives', 'Shared understanding', 'What we’re trying', 'Change noticed', 'Learning'],
  gentle_cbt: ['Goals and target difficulties', 'Triggers, meanings and maintaining cycles', 'Agreed strategies and experiments', 'Responses, exceptions and change', 'Learning from the work'],
  internal_family_systems: ['Aims and inner experience', 'Inner positions and protective responses', 'Agreed exploration', 'Space, curiosity and choice', 'Learning about inner relationships'],
  transactional_analysis: ['Aims and agreements', 'Transactions and relational expectations', 'Agreed changes in exchanges', 'Changes in communication and awareness', 'Learning about relational patterns']
};
export const CLINICAL_LENSES = Object.fromEntries(SUMMARY_LENS_IDS.map(id => [id, {
  id,
  label: SUMMARY_LENS_LABELS[id],
  sections: Object.fromEntries(THERAPY_FOCUS_KINDS.map((kind, index) => [kind, { label: headings[id][index], emptyState: 'Not yet recorded. This does not establish that it is absent from the therapy.' }])),
  allowedKinds: [...THERAPY_FOCUS_KINDS],
  aiFraming: `You support a qualified psychotherapist maintaining a provisional ${SUMMARY_LENS_LABELS[id]} Therapy Focus. Distinguish source reports, clinical hypotheses and actual agreements; never invent findings or progress.`,
  steeringPresets: [
    { label: 'Stay close to evidence', value: 'Stay close to observable evidence and avoid premature interpretation.' },
    { label: 'Alternative possibilities', value: 'Offer alternative hypotheses and preserve uncertainty.' }
  ],
  terminology: { care: 'Therapy Focus', suggestion: 'possibility' }
}]));
export const DEFAULT_LENS_ID = 'integrative';
export function getLens(id) { return CLINICAL_LENSES[normalizeSummaryLens(id)] || CLINICAL_LENSES[DEFAULT_LENS_ID]; }
