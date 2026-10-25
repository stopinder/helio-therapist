// Explicit, testable request routing. Avoid a model call merely to decide
// whether a user wants literature research or their private workspace.
const researchSignal = /\b(?:research|literature|pubmed|europe\s*pmc|evidence|studies?|papers?|systematic\s+reviews?|meta[-\s]?analys(?:is|es)|randomi[sz]ed|clinical\s+trials?|effectiveness|efficacy)\b/i;
const workspacePatterns = [
  /\bwhat\s+(?:else\s+)?(?:needs?|requires?)\s+(?:my|our)\s+attention\b/i,
  /\bwhat\s+(?:do|should)\s+i\s+(?:need\s+to|have\s+to|do)\s+(?:do\s+)?(?:today|tomorrow|this\s+week)\b/i,
  /\bwhat\s+(?:needs?|requires?)\s+attention\s+(?:today|tomorrow|this\s+week)\b/i,
  /\b(?:show|list|find|locate|open|check|review)\s+(?:me\s+)?(?:my|the)\s+(?:upcoming\s+)?(?:appointments?|calendar|schedule|clients?|documents?|files?|reminders?|tasks?|sessions?|notes?|unfinished\s+sessions?)\b/i,
  /\b(?:show|list|find|locate|open|check|review|where\s+(?:are|can\s+i\s+find))\s+(?:me\s+)?(?:my|the|our)\s+(?:(?:client|clinical|practice|signed|blank|completed|draft|intake|therapy|consent|informed\s+consent|assessment|agreement|confidentiality|treatment|registration|disclosure|session)\s+){0,3}(?:forms?|documents?|files?|templates?|paperwork|agreements?|notes?|records?)\b/i,
  /\b(?:consent|informed\s+consent|confidentiality|intake|assessment)\s+(?:forms?|documents?|paperwork|templates?|agreements?)\b/i,
  /\b(?:my|our)\s+(?:appointments?|calendar|schedule|reminders?|clients?|documents?|sessions?)\b/i,
  /\b(?:what|which)\s+(?:of\s+my\s+)?(?:reminders?|appointments?|tasks?)\s+(?:are|do\s+i\s+have)\b/i,
  /\b(?:unfinished|incomplete|outstanding|overdue)\s+(?:sessions?|notes?|documents?|tasks?|reminders?|appointments?)\b/i,
  /\b(?:remind\s+me\s+to|(?:create|add)\s+(?:a\s+)?reminder\s+to)\b/i,
  /\b(?:prepare|preparation|help\s+me\s+prepare)\s+(?:me\s+)?(?:for\s+)?(?:my\s+)?(?:next|upcoming)\s+session\b/i,
  /\bwhich\s+(?:of\s+)?my\s+(?:clients?|documents?|sessions?|appointments?|reminders?)\b/i
];

const documentContinuation = /\b(?:documents?|files?|forms?|paperwork|consent|intake|assessments?|drafts?|finali[sz]ed|reviews?|more\s+results?|next\s+page|previous\s+page|show\s+more|which\s+(?:ones|of\s+these)|open\s+(?:the\s+)?(?:first|second|third|last|latest|most\s+recent)\s+(?:one|document|file|result))\b/i;

export function isClearlyWorkspaceQuestion(query) {
  if (typeof query !== 'string') return false;
  const text = query.trim().replace(/\s+/g, ' ');
  if (!text || text.length > 1200 || researchSignal.test(text)) return false;
  return workspacePatterns.some(pattern => pattern.test(text));
}

export function decideAskHeliosRoute(query, selectedMode, { lastWorkspaceTask = null } = {}) {
  const text = typeof query === 'string' ? query.trim() : '';
  const mode = ['workspace', 'research', 'reflect'].includes(selectedMode) ? selectedMode : 'workspace';
  if (!text || text.length > 1200) return { mode, reason: 'invalid-or-empty', confidence: 'none' };
  if (researchSignal.test(text)) return { mode: 'research', reason: 'explicit-literature-intent', confidence: 'high' };
  if (isClearlyWorkspaceQuestion(text)) return { mode: 'workspace', reason: 'explicit-practice-intent', confidence: 'high' };
  if (lastWorkspaceTask === 'documents' && documentContinuation.test(text)) {
    return { mode: 'workspace', reason: 'document-follow-up', confidence: 'high' };
  }
  return { mode, reason: 'selected-mode', confidence: 'low' };
}

export function resolveAskHeliosMode(query, currentMode, options = {}) {
  return decideAskHeliosRoute(query, currentMode, options).mode;
}
