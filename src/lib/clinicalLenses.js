export const CLINICAL_LENSES = {
  gentle_cbt: {
    id: 'gentle_cbt',
    label: 'Gentle CBT',
    description: 'A trauma-informed, collaborative approach focusing on the connection between thoughts, feelings, and behaviors.',
    sections: {
      current_focus: { label: 'Aims and objectives', emptyState: 'No aims or objectives recorded yet.' },
      shared_understanding: { label: 'Shared Understanding', emptyState: 'Working towards a shared formulation...' },
      trying: { label: 'Trying', emptyState: 'Collaborative experiments and new behaviors.' },
      change_noticed: { label: 'Change Noticed', emptyState: 'Documenting shifts and progress.' },
      learning: { label: 'Learning', emptyState: 'Insights and new skills acquired.' }
    },
    aiFraming: 'You support a qualified therapist maintaining a gentle CBT-informed Care view.',
    steeringPresets: [
      { label: 'Focus on Cognitions', value: 'Emphasize cognitive patterns and thought records.' },
      { label: 'Focus on Behaviors', value: 'Focus on behavioral activation and experiments.' },
      { label: 'Focus on Emotions', value: 'Prioritize emotional awareness and regulation.' }
    ],
    terminology: {
      care: 'Care',
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
    aiFraming: 'You support a qualified therapist maintaining a flexible, integrative clinical view.',
    steeringPresets: [
      { label: 'Focus on Narrative', value: 'Emphasize the client\'s story and evolving meaning.' },
      { label: 'Focus on Relationship', value: 'Focus on the therapeutic alliance and relational dynamics.' }
    ],
    terminology: {
      care: 'Care',
      suggestion: 'possibility'
    }
  }
};

export const DEFAULT_LENS_ID = 'gentle_cbt';

export function getLens(id) {
  return CLINICAL_LENSES[id] || CLINICAL_LENSES[DEFAULT_LENS_ID];
}
