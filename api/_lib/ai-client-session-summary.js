export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = 'client-session-summary-v4';
export const CLIENT_SESSION_SUMMARY_LENSES = Object.freeze(['general', 'gentle_cbt', 'integrative']);
export const CLIENT_SESSION_SUMMARY_FIELDS = Object.freeze(['opening','whatWeWorkedOn','patternsOverTime','changesAndExceptions','strengthsAndResources','perspectiveReflection','betweenSession','closing']);

const COMPARISON_TASKS = Object.freeze(['recurrence', 'change', 'stability', 'exceptions', 'resources', 'unfinished_threads', 'possible_connections']);

const sharedRules = `You are Helios Clinical Intelligence preparing an editable client-facing therapy summary for therapist review.
Use only the supplied reviewed Session Captures, current clinician-accepted Care context, and therapist-authored guidance. Up to three reviewed sessions may be supplied, newest first.
Write in clear, warm, collaborative language that a client can understand. Be substantial when evidence supports it, but never pad sparse material.

Reason in two stages.
Stage 1 — build an internal evidence map before drafting prose. Track each source type separately: reviewed session material, accepted Care context, and therapist-authored guidance. For each reviewed session, identify directly reported material, therapist actions, therapist observations/additions where supplied, changes, exceptions/resources, agreed actions, and unfinished threads. Then compare the sessions for recurrence, change, stability, exceptions, resources, unfinished threads, and possible connections.
Stage 2 — draft the client-facing sections only after the evidence map is complete.

Use these evidence thresholds:
- A point supported only in the current session is a current observation, not a longitudinal pattern.
- Describe something as recurring only when substantially similar evidence appears in two or more reviewed sessions.
- A possible connection must stay tentative unless the client or therapist explicitly established it.
- Recurrence is not causality. Never turn repetition into a causal claim.
- Absence of a topic in a later session is not evidence of improvement.
- Change requires explicit comparative evidence; do not infer improvement from silence.

Therapist-authored guidance is a separate provenance layer. It may clarify therapist observation or emphasis, but it is not a client statement and must never be presented as something the client said or reported.
Current accepted Care context is therapist-reviewed working context, not verbatim client report. Use it to orient continuity, but do not let it override the reviewed sessions.
Do not infer diagnoses, risk, intent, motivation, treatment response, trauma history, or clinical conclusions that are not explicitly supported.
Do not include safeguarding or risk material, therapist-only hypotheses, private reflections, or supervision content in this client-facing output.
If only one reviewed session is supplied, do not claim a longitudinal pattern. Describe tentative connections as tentative.
Prefer specific supported observations, sequence, change, exception and continuity over generic therapeutic language. Avoid generic encouragement that could apply to any client.

Give each client-facing section a distinct job:
- opening: orient the client to the current session and the most important current context. Do not use it to summarise every theme.
- whatWeWorkedOn: describe the concrete topics explored, therapist action or intervention, and the client's response where supported.
- patternsOverTime: include only patterns supported in two or more reviewed sessions. State what recurred and, when supported, the contexts in which it appeared. Leave this empty for a single-session window unless the source itself explicitly establishes earlier recurrence.
- changesAndExceptions: identify explicit change, stability, interruption or exception. Say what was different and what evidence shows the difference; do not manufacture improvement.
- strengthsAndResources: identify specific client capacities, choices, relationships, coping responses or resources demonstrated in the evidence. Do not substitute praise or generic strengths language.
- perspectiveReflection: apply the selected perspective only to supported evidence. Offer useful synthesis without diagnosis or causal certainty, and preserve ambiguity where appropriate.
- betweenSession: include agreed actions, experiments, questions to notice, or unfinished work that has a clear source. Do not invent homework.
- closing: briefly name the most useful thread to carry forward into the next session. Do not repeat the whole summary.

Do not repeat the same point across sections. When one fact could fit several sections, place the detail in the section where it adds the most clinical value and refer to it elsewhere only if the new sentence adds a genuinely different comparison, consequence, exception or next step.
Return JSON only with exactly these string fields: ${CLIENT_SESSION_SUMMARY_FIELDS.join(', ')}. Use an empty string when evidence is insufficient.`;

const lensRules = {
  general: `General lens: remain model-neutral. Focus on supported themes, changes, stable threads, resources, next steps and useful connections. Do not impose CBT terminology.`,
  gentle_cbt: `Gentle CBT lens: where supported, map situation or trigger / antecedent -> thoughts, emotions and body responses -> behaviour or coping response -> short-term consequence and longer-term consequence. Notice repeated maintenance cycles, interruptions or exceptions to a cycle, experiments, coping responses and changes over time. Explicitly look for what interrupts the usual sequence and what the client learns from trying something different. Never manufacture a complete CBT sequence when evidence is missing, and never force CBT language into client-facing prose when ordinary language is clearer.`,
  integrative: `Integrative lens: do not force a single model. Focus on explicitly supported emotional, relational, behavioural and contextual themes, shifts in understanding, unfinished threads, resources and alternative possible meanings. Preserve ambiguity where more than one meaning remains plausible.`
};

export function clientSessionSummarySystemPrompt(lens = 'general') { return `${sharedRules}\n\n${lensRules[lens] || lensRules.general}`; }

export function buildClinicalIntelligenceEvidenceMap({ captures = [], careItems = [], therapistGuidance = '' } = {}) {
  const reviewedSessions = captures.slice(0, 3).map((capture, index) => ({
    sourceType: 'reviewed_session_capture',
    position: index === 0 ? 'current' : `previous_${index}`,
    sessionId: capture.sessionId || capture.session_id || null,
    occurredAt: capture.occurredAt || capture.occurred_at || null,
    reviewedAt: capture.reviewedAt || capture.reviewed_at || null,
    content: capture.content && typeof capture.content === 'object' ? capture.content : {}
  }));

  const currentAcceptedCareContext = careItems
    .filter(item => item?.body)
    .map(item => ({
      sourceType: 'accepted_care',
      kind: item.kind || null,
      content: String(item.body).trim()
    }));

  return {
    reviewedSessions,
    currentAcceptedCareContext,
    therapistAuthoredContext: {
      sourceType: 'therapist_guidance',
      content: String(therapistGuidance || '').trim().slice(0, 12000)
    },
    comparisonTasks: [...COMPARISON_TASKS]
  };
}

export function buildClientSessionSummaryInput({ lens = 'general', window = 'last_three', captures = [], careItems = [], therapistGuidance = '' }) {
  const evidenceMap = buildClinicalIntelligenceEvidenceMap({ captures, careItems, therapistGuidance });
  return JSON.stringify({
    task: 'Prepare structured Clinical Intelligence for a therapist-reviewable client summary.',
    lens,
    window,
    evidenceMap,
    reasoningInstructions: {
      sequence: ['map evidence by source type', 'compare reviewed sessions', 'identify evidence strength', 'draft client-facing sections'],
      recurrenceThreshold: 'two or more reviewed sessions with substantially similar evidence',
      currentObservationRule: 'one-session evidence remains a current observation',
      connectionRule: 'possible connections remain tentative unless explicitly established',
      changeRule: 'change requires explicit comparative evidence; silence is not improvement'
    },
    outputFields: CLIENT_SESSION_SUMMARY_FIELDS
  });
}

export function validateClientSessionSummaryResponse(value) {
  let parsed=value; if(typeof value==='string'){try{parsed=JSON.parse(value)}catch{return null}}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
  const keys=Object.keys(parsed); if(keys.length!==CLIENT_SESSION_SUMMARY_FIELDS.length||!CLIENT_SESSION_SUMMARY_FIELDS.every(key=>keys.includes(key)))return null;
  const sections={}; for(const key of CLIENT_SESSION_SUMMARY_FIELDS){if(typeof parsed[key]!=='string')return null;sections[key]=parsed[key].trim().slice(0,7000)}
  return sections;
}

export function renderClientSessionSummary(sections, lens='general') {
  if(!sections)return '';
  const perspectiveHeading=lens==='gentle_cbt'?'A gentle CBT perspective':lens==='integrative'?'An integrative perspective':'Making sense of what we have noticed';
  const blocks=[
    ['Where things are now',sections.opening],
    ['What we have been working on',sections.whatWeWorkedOn],
    ['Patterns across our recent work',sections.patternsOverTime],
    ['What has shifted — and what has been different',sections.changesAndExceptions],
    ['Strengths and resources',sections.strengthsAndResources],
    [perspectiveHeading,sections.perspectiveReflection],
    ['Ideas to carry forward',sections.betweenSession],
    ['Closing reflection',sections.closing]
  ];
  return blocks.filter(([,body])=>String(body||'').trim()).map(([heading,body])=>`${heading}\n${String(body).trim()}`).join('\n\n');
}
