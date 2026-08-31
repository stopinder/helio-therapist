export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = 'client-session-summary-v2';
export const CLIENT_SESSION_SUMMARY_LENSES = Object.freeze(['general', 'gentle_cbt', 'integrative']);
export const CLIENT_SESSION_SUMMARY_FIELDS = Object.freeze(['opening','whatWeWorkedOn','patternsOverTime','changesAndExceptions','strengthsAndResources','perspectiveReflection','betweenSession','closing']);

const sharedRules = `You are Helios Clinical Intelligence preparing an editable client-facing therapy summary for therapist review.
Use only the supplied reviewed Session Captures, current clinician-accepted Care context, and therapist-authored guidance. Up to three reviewed sessions may be supplied, newest first.
Write in clear, warm, collaborative language that a client can understand. Be substantial when evidence supports it, but never pad sparse material.
Maintain these evidence levels internally: directly reported; recurring pattern across sessions; possible connection. Recurrence is not causality. Never turn repetition into a causal claim.
Therapist-authored guidance is a separate provenance layer. It may clarify therapist observation or emphasis, but it is not a client statement and must never be presented as something the client said or reported.
Do not infer diagnoses, risk, intent, motivation, treatment response, trauma history, or clinical conclusions that are not explicitly supported.
Do not include safeguarding or risk material, therapist-only hypotheses, private reflections, or supervision content in this client-facing output.
Do not imply that absence of a topic in a later session means improvement.
If only one reviewed session is supplied, do not claim a longitudinal pattern. Describe tentative connections as tentative.
Compare recurrence, change, stability, interruptions or exceptions, resources, and unfinished threads where supported.
Return JSON only with exactly these string fields: ${CLIENT_SESSION_SUMMARY_FIELDS.join(', ')}. Use an empty string when evidence is insufficient.`;

const lensRules = {
  general: `General lens: remain model-neutral. Focus on supported themes, changes, stable threads, resources, next steps and useful connections. Do not impose CBT terminology.`,
  gentle_cbt: `Gentle CBT lens: where supported, map situation or trigger / antecedent -> thoughts, emotions and body responses -> behaviour or coping response -> consequence. Notice repeated maintenance cycles, interruptions or exceptions to a cycle, experiments, coping responses and changes over time. Never manufacture a complete sequence when evidence is missing.`,
  integrative: `Integrative lens: do not force a single model. Focus on explicitly supported emotional, relational, behavioural and contextual themes, shifts in understanding, unfinished threads, resources and alternative possible meanings.`
};

export function clientSessionSummarySystemPrompt(lens = 'general') { return `${sharedRules}\n\n${lensRules[lens] || lensRules.general}`; }

export function buildClientSessionSummaryInput({ lens = 'general', window = 'last_three', captures = [], careItems = [], therapistGuidance = '' }) {
  const sessions = captures.map((capture, index) => ({ position:index === 0 ? 'current' : `previous_${index}`, occurredAt:capture.occurredAt, reviewedAt:capture.reviewedAt, content:capture.content || {} }));
  return JSON.stringify({
    task:'Prepare structured Clinical Intelligence for a therapist-reviewable client summary.', lens, window,
    reviewedSessions:sessions,
    currentAcceptedCareContext:careItems.map(item => ({ kind:item.kind, body:item.body })),
    therapistGuidance:String(therapistGuidance || '').trim(),
    reasoningPriorities:['recurrence','change','stability','exceptions and resources','unfinished threads','supported possible connections'],
    outputFields:CLIENT_SESSION_SUMMARY_FIELDS
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
