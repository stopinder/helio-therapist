import { normalizeSummaryLens } from '../../src/lib/summaryLenses.js';
// Scope-specific instructions; no client records or model calls.
export const ACROSS_SESSION_REVIEW_VERSION = 'helios-across-session-review/1.0.0';

export const ACROSS_SESSION_SECTION_INSTRUCTIONS = `ACROSS-SESSION REVIEW — DISTINCT DOCUMENT PURPOSE
Write about how the therapy is developing over the selected period, not a recap of the latest appointment. The latest encounter is one comparison point, not the organising centre. Compare the same supplied evidence regardless of lens. Use encounter dates where available; never invent dates or chronology. Reviewed/uploaded dates are not encounter dates.

Use the existing storage fields to answer these evidence questions. The selected modality mapping supplies the visible headings, not these generic question labels:
The recurring pattern: opening briefly locates the selected period; patternsOverTime describes the supported recurring process with dated examples from at least two independent session IDs. One encounter reporting a repeated event is one reported observation, not independently established recurrence. If recurrence is not established, state that limitation plainly rather than invent a cycle.
What is changing: changesAndExceptions compares an earlier response or understanding with a later difference, with the relevant encounter dates and the limits of that comparison. Separate an observed shift, a self-reported difference and a one-off exception. If change is not established, say so briefly. Silence, insight, attendance and willingness do not demonstrate improvement or sustained progress.
What helps, and under what conditions: strengthsAndResources identifies a supported exception, resource or response and the conditions under which it helped. Keep a single helpful event distinct from a repeatable skill or lasting outcome. Include actual effects of practices only when reported; an agreement to try something is not evidence it worked.
What remains unresolved: whatWeWorkedOn records the specific persistent difficulty or different perspectives across meetings; perspectiveReflection offers the selected lens's tentative formulation only where supported. Keep observation, participant report and possible interpretation distinct. Attribute an earlier-life connection to the person who made it, and keep any further explanation explicitly provisional. Preserve competing meanings and gaps in the evidence.
Where the work might go next: betweenSession records actual agreements, outstanding questions or explicitly requested optional guidance. closing may add a distinct source-supported open thread, otherwise leave it empty. Do not invent homework, benefits, monitoring tasks, agreed plans or an additional body-scan procedure. If practice was agreed but no outcome is recorded, state that its effect is not yet known.

Every visible section must answer its own question; avoid repeating the incident across sections. Compress event logistics to details that explain the pattern, difference or exception. Dates support comparison, not a session-by-session diary. Make the answers to these questions visible under the selected modality headings when meaningful; sparse evidence calls for an honest limit, not filler.
For joint work, consider each participant's supported experience and the interaction between them. Do not give one partner an elaborate psychological account while reducing the other to a reaction, and never manufacture symmetrical motives, shared responsibility or equal progress. Do not reframe coercion or abuse as a mutual communication cycle.
Evidence and limits must remain visible in the prose, not only in hidden citations. An established recurring pattern needs two independent session IDs. Claims labelled explicit_change must cite the earlier and later session evidence; a single-session retrospective report remains attributed current_observation. Hypotheses use tentative_connection. Neither citations nor these mechanical thresholds establish clinical truth.`;

const LONGITUDINAL_LENS_RULES = Object.freeze({
  clinical: 'Compare the presenting difficulties, clinical course, supported formulation factors, protective factors and assessment limits over the dated period. Keep observed findings separate from self-report and provisional hypotheses. State what remains unassessed; a helpful event does not establish a favourable prognosis or risk clearance.',
  integrative: 'Connect supported emotional experience, bodily responses, relational exchanges and circumstances. Explain how these may interact across meetings without assembling a catalogue of modalities. Preserve alternative meanings and the unfinished relational question.',
  gentle_cbt: 'Compare the supported trigger, meaning, emotional/body response, coping response and consequence across meetings. Identify what interrupted the sequence and any actually reported effects of an agreed experiment. Do not invent a complete maintenance cycle or turn a one-off exception into an established skill.',
  internal_family_systems: 'Compare each person’s relationship to supported inner positions over time: urgency, what a response may want or fear, how much it takes over, and any greater space, curiosity or choice. Protective function remains a hypothesis unless explicitly explored. For joint work distinguish each person’s internal experience from the interaction between partners. Do not assign protector roles, exiles, childhood origins or Self-led progress to complete the model.',
  transactional_analysis: 'Compare observable exchanges over time: what help or response was invited, what was offered, how it was received, and what followed. Explore shifts towards collaborative Adult-to-Adult exchange only when supported. Learned rules about usefulness, approval or belonging remain attributed reports or tentative script/driver hypotheses; do not label either partner as a fixed Parent or Child or import IFS explanations.'
});

export function acrossSessionLensRule(lens) {
  return LONGITUDINAL_LENS_RULES[normalizeSummaryLens(lens)] || LONGITUDINAL_LENS_RULES.integrative;
}

export function buildAcrossSessionComparison(sources = []) {
  const sessions = new Map();
  for (const source of sources) {
    const sessionId = source.sessionId || source.session_id;
    if (!sessionId || sessions.has(String(sessionId))) continue;
    sessions.set(String(sessionId), { sessionId: String(sessionId), occurredAt: source.occurredAt || source.occurred_at || source.sessions?.occurred_at || null });
  }
  return {
    documentKind: 'across_session_review',
    version: ACROSS_SESSION_REVIEW_VERSION,
    sessions: [...sessions.values()].sort((a, b) => String(a.occurredAt || '').localeCompare(String(b.occurredAt || ''))),
    boundary: 'Use only these selected encounters. Unknown dates stay unknown. An exception is not sustained progress; absence of evidence is not improvement.'
  };
}
