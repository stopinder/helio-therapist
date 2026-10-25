// High-confidence intent classification. Modes are useful focus choices, but
// clearly operational questions must not trigger a clinical literature search.
// Keep this pure so browser UI and the research API enforce the same boundary.
const researchSignal = /\b(?:research|literature|pubmed|europe\s*pmc|evidence|studies?|papers?|systematic\s+reviews?|meta[-\s]?analys(?:is|es)|randomi[sz]ed|clinical\s+trials?|effectiveness|efficacy)\b/i;

const workspacePatterns = [
  // "What needs my attention this week?" must not fetch PubMed papers.
  /\bwhat\s+(?:else\s+)?(?:needs?|requires?)\s+(?:my|our)\s+attention\b/i,
  /\bwhat\s+(?:do|should)\s+i\s+(?:need\s+to|have\s+to|do)\s+(?:do\s+)?(?:today|tomorrow|this\s+week)\b/i,
  /\bwhat\s+(?:needs?|requires?)\s+attention\s+(?:today|tomorrow|this\s+week)\b/i,
  /\b(?:show|list|find|locate|open|check|review)\s+(?:me\s+)?(?:my|the)\s+(?:upcoming\s+)?(?:appointments?|calendar|schedule|clients?|documents?|files?|reminders?|tasks?|sessions?|notes?|unfinished\s+sessions?)\b/i,
  // A modifier can occur between "my" and the requested record. Examples:
  // "Find my consent forms and documents"; "Where are my client files?".
  /\b(?:show|list|find|locate|open|check|review|where\s+(?:are|can\s+i\s+find))\s+(?:me\s+)?(?:my|the|our)\s+(?:(?:client|clinical|practice|signed|blank|completed|draft|intake|therapy|consent|informed\s+consent|assessment|agreement|confidentiality|treatment|registration|disclosure|session)\s+){0,3}(?:forms?|documents?|files?|templates?|paperwork|agreements?|notes?|records?)\b/i,
  /\b(?:consent|informed\s+consent|confidentiality|intake|assessment)\s+(?:forms?|documents?|paperwork|templates?|agreements?)\b/i,
  /\b(?:my|our)\s+(?:appointments?|calendar|schedule|reminders?|clients?|documents?|sessions?)\b/i,
  /\b(?:what|which)\s+(?:of\s+my\s+)?(?:reminders?|appointments?|tasks?)\s+(?:are|do\s+i\s+have)\b/i,
  /\b(?:unfinished|incomplete|outstanding|overdue)\s+(?:sessions?|notes?|documents?|tasks?|reminders?|appointments?)\b/i,
  /\b(?:remind\s+me\s+to|(?:create|add)\s+(?:a\s+)?reminder\s+to)\b/i,
  /\b(?:prepare|preparation|help\s+me\s+prepare)\s+(?:me\s+)?(?:for\s+)?(?:my\s+)?(?:next|upcoming)\s+session\b/i,
  /\bwhich\s+(?:of\s+)?my\s+(?:clients?|documents?|sessions?|appointments?|reminders?)\b/i
];

export function isClearlyWorkspaceQuestion(query) {
  if (typeof query !== 'string') return false;
  const text = query.trim().replace(/\s+/g, ' ');
  if (!text || text.length > 1200) return false;
  // Don't steal a deliberate scientific question containing workspace words.
  if (researchSignal.test(text)) return false;
  return workspacePatterns.some(pattern => pattern.test(text));
}

export function resolveAskHeliosMode(query, currentMode) {
  if (isClearlyWorkspaceQuestion(query)) return 'workspace';
  return ['workspace', 'research', 'reflect'].includes(currentMode) ? currentMode : 'workspace';
}
