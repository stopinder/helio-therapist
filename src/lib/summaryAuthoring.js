// Shared by every client-facing summary surface and both server generation routes.
// This module contains no client records, practitioner defaults or network requests.
export const SUMMARY_POLICY_VERSION = 'helios-summary-authoring/1.0.0';
export const SUMMARY_AUDIENCES = Object.freeze(['auto', 'individual', 'shared']);
export const SUMMARY_ADDITIONS = Object.freeze(['none', 'exercise', 'resource', 'exercise_and_resource']);
export const SUMMARY_SECTION_GROUPS = Object.freeze([
  { heading: 'What we worked on', fields: ['opening', 'whatWeWorkedOn'] },
  { heading: 'Making sense of the work', fields: ['patternsOverTime', 'perspectiveReflection'] },
  { heading: 'Changes and resources', fields: ['changesAndExceptions', 'strengthsAndResources'] },
  { heading: 'Looking ahead', fields: ['betweenSession', 'closing'] }
]);
export const SUMMARY_HEADINGS = new Set([
  ...SUMMARY_SECTION_GROUPS.map(group => group.heading),
  'Optional exercise to consider', 'Optional resource',
  'Where things are now', 'What we have been working on', 'Patterns across our recent work',
  'What has shifted \u2014 and what has been different', 'Strengths and resources',
  'Making sense of what we have noticed', 'A gentle CBT perspective', 'An integrative perspective',
  'An Internal Family Systems perspective', 'Different parts of you in this work',
  'A Transactional Analysis perspective', 'Ideas to carry forward', 'Closing reflection'
]);
function invalid(message) {
  return Object.assign(new Error(message), { code: 'INVALID_SUMMARY_OPTIONS', status: 400 });
}
export function safeResourceUrl(value) {
  if (typeof value !== 'string' || value.length > 1000 || /[\r\n\u0000-\u001f]/.test(value)) throw invalid('Provide a valid public HTTPS resource link.');
  let url;
  try { url = new URL(value.trim()); } catch { throw invalid('Provide a valid public HTTPS resource link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw invalid('Only public HTTPS resource links are supported.');
  url.hash = '';
  return url.href;
}
export function normalizeSummaryOptions(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['audience', 'addition', 'resource'].includes(key))) throw invalid('Choose valid summary preferences.');
  const audience = value.audience ?? 'auto';
  const addition = value.addition ?? 'none';
  if (!SUMMARY_AUDIENCES.includes(audience) || !SUMMARY_ADDITIONS.includes(addition)) throw invalid('Choose a valid audience and optional addition.');
  const wantsResource = ['resource', 'exercise_and_resource'].includes(addition);
  let resource = null;
  if (wantsResource) {
    const item = value.resource;
    if (!item || typeof item !== 'object' || Array.isArray(item) || item.reviewed !== true ||
        typeof item.title !== 'string' || !item.title.trim() || item.title.length > 180 ||
        (item.purpose !== undefined && (typeof item.purpose !== 'string' || item.purpose.length > 500))) {
      throw invalid('Review the resource and its suitability before including it.');
    }
    resource = { url: safeResourceUrl(item.url), title: item.title.trim().replace(/[\r\n]+/g, ' '),
      purpose: (item.purpose || '').trim(), reviewed: true };
  } else if (value.resource != null) {
    throw invalid('A resource cannot be included when no resource addition was selected.');
  }
  return { audience, addition, resource };
}
export function wantsSummaryExercise(options) {
  return ['exercise', 'exercise_and_resource'].includes(options?.addition);
}
export function renderSummarySections(sections = {}) {
  return SUMMARY_SECTION_GROUPS.map(group => {
    const paragraphs = group.fields.map(key => typeof sections[key] === 'string' ? sections[key].trim() : '').filter(Boolean);
    return paragraphs.length ? `${group.heading}\n\n${paragraphs.join('\n\n')}` : '';
  }).filter(Boolean).join('\n\n');
}
export function resourceAppendix(resource, verification) {
  if (!resource) return '';
  const url = safeResourceUrl(resource.url);
  if (!verification || verification.url !== url || verification.status !== 'reachable') throw invalid('The selected resource link has not been checked.');
  const title = resource.title.replace(/[\[\]<>\r\n]/g, '').trim();
  const link = url.replace(/[()]/g, char => char === '(' ? '%28' : '%29');
  const purpose = resource.purpose ? `\n\n${resource.purpose}` : '';
  return `\n\nOptional resource\n\n[${title}](${link})\n\nAn optional reference to consider, rather than an agreed between-session task.${purpose}`;
}
// Explicit headings only. Short sentences, names and raw URLs are NOT headings.
export function parseSummaryBlocks(body = '') {
  const blocks = [];
  for (const raw of String(body).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.replace(/^#{1,3}\s+/, '').replace(/:$/, '');
    if (SUMMARY_HEADINGS.has(heading) || (/^#{1,3}\s+/.test(line) && !/https?:\/\//i.test(heading))) {
      blocks.push({ type: 'heading', content: heading });
      continue;
    }
    const pieces = [];
    const pattern = /\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g;
    let start = 0;
    for (const match of line.matchAll(pattern)) {
      if (match.index > start) pieces.push({ text: line.slice(start, match.index) });
      try { pieces.push({ text: match[1], href: safeResourceUrl(match[2]) }); }
      catch { pieces.push({ text: match[0] }); }
      start = match.index + match[0].length;
    }
    if (start < line.length) pieces.push({ text: line.slice(start) });
    blocks.push({ type: 'paragraph', content: line, pieces });
  }
  return blocks;
}
export function summaryBodyToRichContent(body) {
  const content = parseSummaryBlocks(body).map(block => block.type === 'heading'
    ? { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: block.content }] }
    : { type: 'paragraph', content: block.pieces.map(piece => ({ type: 'text', text: piece.text,
        ...(piece.href ? { marks: [{ type: 'link', attrs: { href: piece.href, target: '_blank', rel: 'noopener noreferrer' } }] } : {}) })) });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}
export function summaryContextKey(value) { return JSON.stringify(value); }
export function candidateMatches(candidate, body, contextKey) {
  return Boolean(candidate && candidate.baseBody === body && candidate.contextKey === contextKey);
}
