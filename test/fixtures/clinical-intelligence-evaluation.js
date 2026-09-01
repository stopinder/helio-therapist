export const CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC = Object.freeze([
  'factual_grounding',
  'longitudinal_usefulness',
  'specificity',
  'client_readability',
  'exceptions_and_resources',
  'actionable_continuity',
  'provenance_safety',
  'unsupported_inference',
  'repetition'
]);

export const CLINICAL_INTELLIGENCE_CASES = Object.freeze([
  {
    id: 'gentle-cbt-work-uncertainty',
    lens: 'gentle_cbt',
    captures: [
      {
        sessionId: 's3', occurredAt: '2026-08-30',
        content: {
          presentingConcerns: 'Client described feeling tense after receiving a short email from their manager and worried they had done something wrong.',
          sessionThemes: 'Uncertainty at work, self-critical interpretation, repeated checking of messages.',
          interventionsUsed: 'Therapist slowed the sequence down and invited the client to separate the email itself from the meaning they gave it.',
          clientResponse: 'Client noticed they had reread the email repeatedly and delayed replying until a colleague reassured them.',
          progressGoals: 'Client wanted to notice the urge to check earlier and respond with less delay.',
          planNextSession: 'Review what happened when uncertainty arose again.'
        }
      },
      {
        sessionId: 's2', occurredAt: '2026-08-23',
        content: {
          presentingConcerns: 'Client reported worry after ambiguous feedback from a senior colleague.',
          sessionThemes: 'Fear of having made a mistake and repeated checking of Teams messages.',
          interventionsUsed: 'Therapist explored the sequence between uncertainty, self-critical thoughts and checking.',
          clientResponse: 'Client said checking reduced uncertainty briefly but kept them focused on the possibility of having failed.',
          progressGoals: 'Try asking one clarifying question rather than repeatedly reviewing messages.'
        }
      },
      {
        sessionId: 's1', occurredAt: '2026-08-16',
        content: {
          presentingConcerns: 'Client felt unsettled after unclear feedback at work.',
          sessionThemes: 'Self-doubt and difficulty tolerating not knowing what another person meant.',
          clientResponse: 'Client described feeling calmer after talking the situation through with a trusted colleague.',
          progressGoals: 'Notice what helps before checking repeatedly.'
        }
      }
    ],
    careItems: [{ kind: 'current_focus', body: 'Self-critical interpretations when work feedback is ambiguous.' }],
    therapistGuidance: 'Emphasise the repeated sequence and the exception when seeking another perspective helped.',
    expectedSignals: {
      recurring: ['uncertainty or ambiguous feedback', 'self-critical interpretation', 'repeated checking'],
      exception: ['trusted colleague', 'another perspective'],
      action: ['notice the urge earlier', 'clarifying question'],
      avoid: ['diagnosis', 'causes', 'no risk']
    }
  },
  {
    id: 'integrative-relationship-boundaries',
    lens: 'integrative',
    captures: [
      {
        sessionId: 'r3', occurredAt: '2026-08-29',
        content: {
          presentingConcerns: 'Client described agreeing to a family request despite feeling exhausted.',
          sessionThemes: 'Responsibility, guilt, difficulty saying no, resentment afterwards.',
          interventionsUsed: 'Therapist invited exploration of the conflict between caring for others and protecting personal limits.',
          clientResponse: 'Client noticed anger often appeared only after they had already agreed.',
          progressGoals: 'Pause before answering requests when possible.'
        }
      },
      {
        sessionId: 'r2', occurredAt: '2026-08-22',
        content: {
          presentingConcerns: 'Client felt overwhelmed after taking on extra responsibilities for a sibling.',
          sessionThemes: 'Guilt about disappointing family and difficulty recognising their own limit.',
          clientResponse: 'Client said they usually realised they were resentful later.'
        }
      },
      {
        sessionId: 'r1', occurredAt: '2026-08-15',
        content: {
          presentingConcerns: 'Client described saying yes to a friend when they wanted to rest.',
          sessionThemes: 'Fear of letting people down.',
          clientResponse: 'Client noticed relief when they later declined a second request.'
        }
      }
    ],
    careItems: [{ kind: 'current_focus', body: 'Balancing care for others with awareness of personal limits.' }],
    therapistGuidance: 'Keep the summary collaborative; do not imply a fixed relational pattern or motive.',
    expectedSignals: {
      recurring: ['difficulty saying no', 'guilt or fear of disappointing others'],
      change: ['pause before answering', 'declined a request'],
      unfinished: ['recognising limits earlier'],
      avoid: ['people-pleasing diagnosis', 'attachment explanation', 'causal certainty']
    }
  },
  {
    id: 'general-sparse-evidence',
    lens: 'general',
    captures: [
      {
        sessionId: 'g1', occurredAt: '2026-08-31',
        content: {
          presentingConcerns: 'Client reported poor sleep before an upcoming presentation.',
          sessionThemes: 'Presentation anxiety and preparation.',
          interventionsUsed: 'Therapist helped the client identify one practical preparation step.',
          planNextSession: 'Review how the presentation went.'
        }
      }
    ],
    careItems: [],
    therapistGuidance: '',
    expectedSignals: {
      currentOnly: ['presentation anxiety', 'poor sleep'],
      avoid: ['recurring pattern', 'improvement', 'cause', 'diagnosis']
    }
  }
]);
