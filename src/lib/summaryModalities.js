// Public, versioned modality contracts. Clinical source text never belongs here.
export const INTELLIGENCE_VERSION = 'helios-modality-intelligence/2.2.0';
export const SUMMARY_MODALITIES = Object.freeze({
  general: {
    id: 'general', label: 'General', version: '1.0.0',
    description: 'A source-led account of what matters, what changed and what remains open.',
    sections: { focus: 'What mattered in this session', understanding: 'What became clearer', continuity: 'What to carry forward' },
    formulation: { centralWork: 'Central work', observedChanges: 'Observed changes', resources: 'Available resources', openThreads: 'Open threads' }
  },
  gentle_cbt: {
    id: 'gentle_cbt', label: 'CBT', version: '1.0.0',
    description: 'Connect situations, meanings, responses and consequences; notice what interrupts the pattern.',
    sections: { cycle: 'Understanding the pattern', learning: 'What we tested or noticed', nextSteps: 'Building on the learning' },
    formulation: { situations: 'Situations and triggers', meanings: 'Predictions and meanings', embodiedResponses: 'Emotions and bodily responses', coping: 'Coping responses', consequences: 'Short-term effects and possible maintaining consequences', exceptions: 'Exceptions and learning', experiments: 'Agreed experiments and open questions' }
  },
  internal_family_systems: {
    id: 'internal_family_systems', label: 'Internal Family Systems', version: '1.0.0',
    description: 'Explore inner positions and their relationships, without turning every preference into a protector.',
    sections: { positions: 'The different responses within you', relationship: 'Finding space around these responses', continuing: 'Continuing with curiosity' },
    formulation: { innerPositions: 'Client-described inner positions', protectivePossibilities: 'Possible protective intentions', polarisation: 'Relationships and polarisation', selfRelationship: 'Relationship to inner experience', discernment: 'Discernment and alternative meanings', unfinishedWork: 'Capacities and unfinished work' }
  },
  integrative: {
    id: 'integrative', label: 'Integrative', version: '1.0.0',
    description: 'Bring emotional, bodily, relational and practical context into one coherent understanding.',
    sections: { experience: 'The experience at the centre of our work', connections: 'Connections and possible meanings', direction: 'What feels important from here' },
    formulation: { centralDilemma: 'Central dilemma', relationalContext: 'Relational context', embodiedExperience: 'Emotional and bodily experience', meaningAndAgency: 'Meaning, agency and choice', circumstances: 'Practical circumstances', possibilities: 'Changes, resources and open possibilities' }
  },
  transactional_analysis: {
    id: 'transactional_analysis', label: 'Transactional Analysis', version: '1.0.0',
    description: 'Examine exchanges, expectations and opportunities for more deliberate relating.',
    sections: { exchanges: 'Noticing the exchange', expectations: 'Expectations and ways of responding', choices: 'Making room for different choices' },
    formulation: { exchanges: 'Observable exchanges', egoStatePossibilities: 'Possible ego-state shifts', transactions: 'Reciprocal or crossed transactions', expectations: 'Expectations and possible scripts', alternatives: 'Alternative meanings', adultChoice: 'Awareness, choices and agreements' }
  }
});
export const MODALITY_HEADINGS = Object.freeze(Object.values(SUMMARY_MODALITIES).flatMap(profile => Object.values(profile.sections)));
export function getSummaryModality(id) {
  const profile = Object.hasOwn(SUMMARY_MODALITIES, id) ? SUMMARY_MODALITIES[id] : null;
  if (!profile) throw Object.assign(new Error('Choose a supported clinical approach.'), { code: 'INVALID_MODALITY', status: 400 });
  return profile;
}
export function normalizeIntelligenceOptions(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['mode','includeZoomSummary'].includes(key))) {
    throw Object.assign(new Error('Choose valid clinical intelligence options.'), { code: 'INVALID_INTELLIGENCE_OPTIONS', status: 400 });
  }
  const mode = value.mode ?? 'client_summary';
  if (!['client_summary','therapist_formulation'].includes(mode) || (value.includeZoomSummary !== undefined && typeof value.includeZoomSummary !== 'boolean')) {
    throw Object.assign(new Error('Choose a valid output and source selection.'), { code: 'INVALID_INTELLIGENCE_OPTIONS', status: 400 });
  }
  return { mode, includeZoomSummary: value.includeZoomSummary === true };
}
