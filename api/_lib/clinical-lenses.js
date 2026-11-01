const CLINICAL_LENSES = {
  general: {
    id: 'general',
    aiFraming: 'You support a qualified psychotherapist maintaining a non-prescriptive Therapy Focus.',
    allowedKinds: ['current_focus', 'shared_understanding', 'trying', 'change_noticed', 'learning']
  },
  gentle_cbt: {
    id: 'gentle_cbt',
    aiFraming: 'You support a qualified therapist maintaining a gentle CBT-informed Therapy Focus.',
    allowedKinds: ['current_focus', 'shared_understanding', 'trying', 'change_noticed', 'learning']
  },
  integrative: {
    id: 'integrative',
    aiFraming: 'You support a qualified therapist maintaining a flexible, integrative Therapy Focus.',
    allowedKinds: ['current_focus', 'narrative', 'themes', 'interventions', 'outcomes']
  }
};

const DEFAULT_LENS_ID = 'gentle_cbt';

export function resolveLensConfig(id) {
  return CLINICAL_LENSES[id] || CLINICAL_LENSES[DEFAULT_LENS_ID];
}
