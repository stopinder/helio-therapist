export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = 'client-session-summary-v1';

export const CLIENT_SESSION_SUMMARY_LENSES = Object.freeze(['general', 'gentle_cbt', 'integrative']);

const sharedRules = `You are Helios Clinical Intelligence preparing an editable client-facing therapy session summary for therapist review.
Use only the supplied reviewed Session Captures and current clinician-accepted Care context. Up to three reviewed sessions may be supplied, newest first.
Write in clear, warm, collaborative language that a client can understand. Be substantial but concise: useful synthesis, not a transcript recap.
Maintain these evidence levels internally: directly reported; recurring pattern across sessions; possible connection. Recurrence is not causality. Never turn repetition into a causal claim.
Do not infer diagnoses, risk, intent, motivation, treatment response, trauma history, or clinical conclusions that are not explicitly supported.
Do not include safeguarding or risk material, therapist-only hypotheses, private reflections, or supervision content in this client-facing output.
Do not imply that absence of a topic in a later session means improvement.
If only one reviewed session is supplied, do not claim a longitudinal pattern.
Describe tentative connections as tentative. Prefer phrases such as "we noticed", "has come up more than once", and "may be connected".
Return JSON with one key: body. body must be a polished editable document using plain-text headings and paragraphs.`;

const lensRules = {
  general: `General lens: remain model-neutral. Focus on what was worked on today, what has been recurring, what has changed or stayed stable, supported connections, what has helped, agreed next steps, and what to carry forward. Do not impose CBT terminology.`,
  gentle_cbt: `Gentle CBT lens: use collaborative, non-pathologising CBT-informed language where supported. Look for a supported sequence such as situation or trigger / antecedent -> thoughts, emotions, and body responses -> behaviour or coping response -> consequence. Note repeated maintenance cycles, interruptions to a cycle, experiments, coping responses, and changes over time. Never manufacture a complete sequence when evidence is missing.`,
  integrative: `Integrative lens: do not force a single model. Focus on recurring themes, emotional or relational patterns that are explicitly supported, connections becoming clearer, shifts in understanding, what the client repeatedly returns to, what appears unfinished, what has helped, and what to carry forward.`
};

export function clientSessionSummarySystemPrompt(lens = 'general') {
  return `${sharedRules}\n\n${lensRules[lens] || lensRules.general}`;
}

export function buildClientSessionSummaryInput({ lens = 'general', window = 'last_three', captures = [], careItems = [] }) {
  const sessions = captures.map((capture, index) => ({
    position: index === 0 ? 'current' : `previous_${index}`,
    occurredAt: capture.occurredAt,
    reviewedAt: capture.reviewedAt,
    content: capture.content || {}
  }));
  return JSON.stringify({
    task: 'Prepare the therapist-reviewable client session summary.',
    lens,
    window,
    reviewedSessions: sessions,
    currentAcceptedCareContext: careItems.map(item => ({ kind: item.kind, body: item.body })),
    requiredStructure: [
      'What we worked on today',
      'What we noticed or understood',
      'What we did or tried',
      ...(window === 'last_three' && sessions.length > 1 ? ['What we are noticing over time'] : []),
      'What may be useful between sessions',
      'What we will carry forward'
    ]
  });
}

export function validateClientSessionSummaryResponse(value) {
  let parsed = value;
  if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { return null; } }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.body !== 'string') return null;
  const body = parsed.body.trim();
  if (body.length < 120 || body.length > 12000) return null;
  return { body };
}
