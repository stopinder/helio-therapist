// Public choices. Legacy General is accepted only as an Integrative alias.
export const SUMMARY_LENS_IDS = Object.freeze(['clinical', 'integrative', 'gentle_cbt', 'internal_family_systems', 'transactional_analysis']);
export const SUMMARY_LENS_LABELS = Object.freeze({ clinical: 'Clinical', integrative: 'Integrative', gentle_cbt: 'CBT', internal_family_systems: 'Internal Family Systems (IFS)', transactional_analysis: 'Transactional Analysis' });
export function normalizeSummaryLens(lens = 'integrative') { return lens === 'general' ? 'integrative' : lens; }
const group = (heading, ...fields) => ({ heading, fields });
export const MODALITY_SECTION_GROUPS = Object.freeze({
  clinical: [
    group('Presenting difficulties and assessment context', 'opening', 'whatWeWorkedOn'),
    group('Clinical formulation and contributing factors', 'patternsOverTime', 'perspectiveReflection'),
    group('Clinical course and observed changes', 'changesAndExceptions'),
    group('Protective factors and resources', 'strengthsAndResources'),
    group('Assessment limits and outstanding questions', 'closing'),
    group('Plan and review', 'betweenSession')
  ],
  gentle_cbt: [
    group('Situations, triggers and meanings', 'opening', 'whatWeWorkedOn'),
    group('Responses and maintaining cycles', 'patternsOverTime', 'perspectiveReflection'),
    group('Changes, exceptions and learning', 'changesAndExceptions'),
    group('Coping responses and resources', 'strengthsAndResources'),
    group('Agreed experiments and next steps', 'betweenSession', 'closing')
  ],
  internal_family_systems: [
    group('Inner experience and context', 'opening', 'whatWeWorkedOn'),
    group('Protective responses and inner relationships', 'patternsOverTime', 'perspectiveReflection'),
    group('Changes in space, curiosity and choice', 'changesAndExceptions'),
    group('Sources of connection and capacity', 'strengthsAndResources'),
    group('Agreed exploration and unfinished work', 'betweenSession', 'closing')
  ],
  transactional_analysis: [
    group('Relational context and exchanges', 'opening', 'whatWeWorkedOn'),
    group('Transactions and recurring expectations', 'patternsOverTime', 'perspectiveReflection'),
    group('Changes in exchanges and awareness', 'changesAndExceptions'),
    group('Collaborative responses and resources', 'strengthsAndResources'),
    group('Agreements and next steps', 'betweenSession', 'closing')
  ]
});
export function summaryLensSectionGroups(lens, documentKind, fallback) {
  const groups = MODALITY_SECTION_GROUPS[normalizeSummaryLens(lens)];
  if (!groups) return fallback;
  if (documentKind !== 'across_session_review') return groups;
  // Preserve each modality's conceptual organisation while making period scope explicit.
  return groups.map((item, index) => index === 0 ? { ...item, heading: {
    clinical: 'Presenting difficulties and assessment period',
    gentle_cbt: 'Situations, triggers and meanings across sessions',
    internal_family_systems: 'Inner experience across sessions',
    transactional_analysis: 'Relational context across sessions'
  }[normalizeSummaryLens(lens)] } : item);
}
