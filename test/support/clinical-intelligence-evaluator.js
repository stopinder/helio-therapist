import { CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC } from '../fixtures/clinical-intelligence-evaluation.js';

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, phrases = []) {
  const haystack = normalise(text);
  return phrases.some(phrase => haystack.includes(normalise(phrase)));
}

function repeatedSentencePenalty(text) {
  const sentences = String(text || '').split(/[.!?]+/).map(part => normalise(part)).filter(part => part.length > 35);
  const seen = new Set();
  let repeats = 0;
  for (const sentence of sentences) {
    if (seen.has(sentence)) repeats += 1;
    seen.add(sentence);
  }
  return Math.min(repeats, 2);
}

export function scoreClinicalIntelligenceOutput(testCase, output) {
  const text = String(output || '');
  const signals = testCase.expectedSignals || {};
  const scores = Object.fromEntries(CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC.map(key => [key, 0]));
  const notes = [];

  const expectedPositive = [
    ...(signals.recurring || []),
    ...(signals.change || []),
    ...(signals.exception || []),
    ...(signals.unfinished || []),
    ...(signals.action || []),
    ...(signals.currentOnly || [])
  ];
  const positiveMatches = expectedPositive.filter(phrase => includesAny(text, [phrase])).length;
  scores.factual_grounding = expectedPositive.length ? Math.min(5, Math.round((positiveMatches / expectedPositive.length) * 5)) : 5;
  scores.specificity = expectedPositive.length ? Math.min(5, positiveMatches) : 3;

  const hasLongitudinalLanguage = /across|over time|recent sessions|more than once|repeated|recurr/i.test(text);
  if ((signals.recurring || []).length) scores.longitudinal_usefulness = hasLongitudinalLanguage ? 5 : 2;
  else scores.longitudinal_usefulness = hasLongitudinalLanguage ? 1 : 5;

  scores.exceptions_and_resources = (signals.exception || signals.change)
    ? (includesAny(text, [...(signals.exception || []), ...(signals.change || [])]) ? 5 : 1)
    : 4;

  scores.actionable_continuity = (signals.action || signals.unfinished)
    ? (includesAny(text, [...(signals.action || []), ...(signals.unfinished || [])]) ? 5 : 2)
    : 4;

  const unsafe = (signals.avoid || []).filter(phrase => includesAny(text, [phrase]));
  scores.unsupported_inference = unsafe.length ? 0 : 5;
  scores.provenance_safety = /the therapist thinks you|you told your therapist that/i.test(text) ? 1 : 5;

  const wordCount = normalise(text).split(' ').filter(Boolean).length;
  scores.client_readability = wordCount < 40 ? 2 : wordCount > 1200 ? 2 : 5;

  const repetitionPenalty = repeatedSentencePenalty(text);
  scores.repetition = Math.max(0, 5 - (repetitionPenalty * 2));
  if (repetitionPenalty) notes.push(`Repeated sentence penalty: ${repetitionPenalty}`);
  if (unsafe.length) notes.push(`Unsupported/forbidden signals detected: ${unsafe.join(', ')}`);

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const max = CLINICAL_INTELLIGENCE_EVALUATION_RUBRIC.length * 5;
  return {
    caseId: testCase.id,
    scores,
    total,
    max,
    percentage: Math.round((total / max) * 100),
    notes
  };
}

export function compareClinicalIntelligenceOutputs(testCase, candidates) {
  return Object.entries(candidates).map(([name, output]) => ({ name, ...scoreClinicalIntelligenceOutput(testCase, output) }))
    .sort((a, b) => b.total - a.total);
}
