export const CLINICAL_LENSES = {
  general: {
    id: 'general',
    label: 'General',
    description: 'A non-prescriptive psychotherapy view that stays close to the client’s aims, shared understanding and emerging change.',
    sections: {
      current_focus: { label: 'Aims and objectives', emptyState: 'No aims or objectives recorded yet.' },
      shared_understanding: { label: 'Shared understanding', emptyState: 'The working understanding is still emerging...' },
      trying: { label: 'What we’re trying', emptyState: 'No agreed experiments or next steps recorded yet.' },
      change_noticed: { label: 'Change noticed', emptyState: 'No change has been recorded yet.' },
      learning: { label: 'Learning', emptyState: 'No learning has been recorded yet.' }
    },
    aiFraming: 'You support a qualified psychotherapist maintaining a non-prescriptive Therapy Focus.',
    steeringPresets: [
      { label: 'Stay close to evidence', value: 'Stay close to observable evidence and avoid premature interpretation.' },
      { label: 'Alternative possibilities', value: 'Offer alternative hypotheses and preserve uncertainty.' }
    ],
    terminology: {
      care: 'Therapy Focus',
      suggestion: 'suggestion'
    }
  },
  gentle_cbt: {
    id: 'gentle_cbt',
    label: 'Gentle CBT',
    description: 'A trauma-informed, collaborative approach focusing on the connection between thoughts, feelings, and behaviors.',
    sections: {
      current_focus: { label: 'Aims and objectives', emptyState: 'No aims or objectives recorded yet.' },
      shared_understanding: { label: 'Shared Understanding', emptyState: 'Working towards a shared formulation...' },
      trying: { label: 'What we’re trying', emptyState: 'Collaborative experiments and new behaviours.' },
      change_noticed: { label: 'Change noticed', emptyState: 'Documenting shifts and progress.' },
      learning: { label: 'Learning', emptyState: 'Insights and new skills acquired.' }
    },
    aiFraming: 'You support a qualified therapist maintaining a gentle CBT-informed Therapy Focus.',
    steeringPresets: [
      { label: 'Focus on Cognitions', value: 'Emphasize cognitive patterns and thought records.' },
      { label: 'Focus on Behaviors', value: 'Focus on behavioral activation and experiments.' },
      { label: 'Focus on Emotions', value: 'Prioritize emotional awareness and regulation.' }
    ],
    terminology: {
      care: 'Therapy Focus',
      suggestion: 'suggestion'
    }
  },
  integrative: {
    id: 'integrative',
    label: 'Integrative',
    description: 'A flexible, non-prescriptive approach that draws from multiple therapeutic modalities as needed.',
    sections: {
      current_focus: { label: 'Aims and objectives', emptyState: 'No aims or objectives recorded yet.' },
      narrative: { label: 'Clinical Narrative', emptyState: 'The story of the work is emerging...' },
      themes: { label: 'Key Themes', emptyState: 'Important threads will appear here.' },
      interventions: { label: 'Interventions', emptyState: 'Documenting what was tried.' },
      outcomes: { label: 'Outcomes', emptyState: 'Noticing the impact of the work.' }
    },
    aiFraming: 'You support a qualified therapist maintaining a flexible, integrative Therapy Focus.',
    steeringPresets: [
      { label: 'Focus on Narrative', value: 'Emphasize the client\'s story and evolving meaning.' },
      { label: 'Focus on Relationship', value: 'Focus on the therapeutic alliance and relational dynamics.' }
    ],
    terminology: {
      care: 'Therapy Focus',
      suggestion: 'possibility'
    }
  }
};

export const DEFAULT_LENS_ID = 'gentle_cbt';

export function getLens(id) {
  return CLINICAL_LENSES[id] || CLINICAL_LENSES[DEFAULT_LENS_ID];
}
