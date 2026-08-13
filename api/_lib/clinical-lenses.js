const CLINICAL_LENSES = {
  gentle_cbt: {
    id: 'gentle_cbt',
    aiFraming: 'You support a qualified therapist maintaining a gentle CBT-informed Care view.',
    allowedKinds: ['current_focus', 'shared_understanding', 'trying', 'change_noticed', 'learning']
  },
  integrative: {
    id: 'integrative',
    aiFraming: 'You support a qualified therapist maintaining a flexible, integrative clinical view.',
    allowedKinds: ['narrative', 'themes', 'interventions', 'outcomes']
  }
};

const DEFAULT_LENS_ID = 'gentle_cbt';

export function resolveLensConfig(id) {
  return CLINICAL_LENSES[id] || CLINICAL_LENSES[DEFAULT_LENS_ID];
}
