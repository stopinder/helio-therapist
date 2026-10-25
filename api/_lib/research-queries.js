// Deterministic search expressions for PubMed and Europe PMC.
// Do not bill an AI action to decide how to search an external index.
const APPROACHES = [
  { re: /\b(?:exposure[\s-]+(?:and[\s-]+)?response[\s-]+prevention|ERP)\b/i, terms: ['"exposure and response prevention"', '"exposure response prevention"', 'ERP'] },
  { re: /\b(?:internal family systems|IFS)\b/i, terms: ['"internal family systems"', '"IFS therapy"'] },
  { re: /\b(?:cognitive[\s-]+behaviou?ral[\s-]+therapy|CBT)\b/i, terms: ['"cognitive behavioral therapy"', '"cognitive behavioural therapy"', 'CBT'] },
  { re: /\b(?:eye[\s-]+movement[\s-]+desensiti[sz]ation[\s-]+and[\s-]+reprocessing|EMDR)\b/i, terms: ['"eye movement desensitization and reprocessing"', 'EMDR'] },
  { re: /\b(?:acceptance[\s-]+and[\s-]+commitment[\s-]+therapy|ACT therapy)\b/i, terms: ['"acceptance and commitment therapy"'] },
  { re: /\b(?:dialectical[\s-]+behaviou?r(?:al)?[\s-]+therapy|DBT)\b/i, terms: ['"dialectical behavior therapy"', 'DBT'] },
  { re: /\b(?:psychodynamic|psychoanalytic)\b/i, terms: ['psychodynamic', 'psychoanalytic'] }
];
const CONDITIONS = [
  { re: /\b(?:obsessive[\s-]+compulsive[\s-]+disorder|OCD)\b/i, terms: ['"obsessive-compulsive disorder"', 'OCD'] },
  { re: /\b(?:post[\s-]+traumatic[\s-]+stress[\s-]+disorder|PTSD)\b/i, terms: ['"post-traumatic stress disorder"', 'PTSD'] },
  { re: /\b(?:major[\s-]+depressive[\s-]+disorder|depression|depressive)\b/i, terms: ['depression', '"depressive disorder"'] },
  { re: /\b(?:generalized[\s-]+anxiety[\s-]+disorder|generalised[\s-]+anxiety[\s-]+disorder|GAD)\b/i, terms: ['"generalized anxiety disorder"', '"generalised anxiety disorder"'] },
  { re: /\b(?:social[\s-]+anxiety|social[\s-]+phobia)\b/i, terms: ['"social anxiety disorder"', '"social phobia"'] },
  { re: /\b(?:panic[\s-]+disorder|panic[\s-]+attacks?)\b/i, terms: ['"panic disorder"'] },
  { re: /\b(?:borderline[\s-]+personality[\s-]+disorder|BPD)\b/i, terms: ['"borderline personality disorder"'] },
  { re: /\b(?:schizophreni(?:a|c)|schizoaffective)\b/i, terms: ['schizophrenia', '"schizophrenia spectrum"'] },
  { re: /\b(?:insomnia|sleep[\s-]+disorder)\b/i, terms: ['insomnia', '"sleep disorder"'] },
  { re: /\b(?:anxiety[\s-]+disorders?|anxiety)\b/i, terms: ['anxiety'] }
];
const OUTCOMES = [
  { re: /\\b(?:mortality|death rates?|premature deaths?|dying earlier|survival|life expectancy|lifespan|life span|years? of (?:life )?lost)\\b/i,
    terms: ['mortality', '"standardized mortality ratio"', '"life expectancy"', '"years of potential life lost"'] }
];
const REVIEW_REQUEST = /\b(?:systematic\s+reviews?|meta[\s-]?analys(?:is|es)|evidence\s+synthes(?:is|es)|umbrella\s+reviews?)\b/i;
const REVIEW_RESULT = /\b(?:systematic\s+reviews?|meta[\s-]?analys(?:is|es)|network\s+meta[\s-]?analysis|umbrella\s+reviews?)\b/i;
const STOP_WORDS = new Set('what which where why when how is are does do did the this these that those there an and or to in on for from by about of with without as can should evidence current latest recent provided regarding effectiveness effective treating treatment therapy therapies clinical research studies study systematic reviews review meta analysis meta-analysis compared compare versus vs tell know much well'.split(/\s+/));

const group = terms => terms.length === 1 ? terms[0] : '(' + terms.join(' OR ') + ')';
const matchGroups = (text, groups) => groups.filter(item => item.re.test(text)).slice(0, 2);
const fallbackTerms = text => [...new Set((text.toLowerCase().match(/[a-z][a-z-]*/g) || [])
  .filter(word => word.length > 2 && !STOP_WORDS.has(word)))].slice(0, 6);

/**
 * Creates review-aware queries from clinically meaningful concepts, not from
 * the first few words of a natural-language question.
 */
export function generateResearchQueries(question, history = []) {
  const text = String(question || '').trim().slice(0, 600);
  if (!text) return [];
  const prior = Array.isArray(history)
    ? [...history].reverse().find(item => item?.role === 'user' && typeof item.content === 'string')?.content?.slice(0, 600) || ''
    : '';
  const approaches = matchGroups(text, APPROACHES);
  const conditions = matchGroups(text, CONDITIONS);
  // A short follow-up such as "And what about children?" may reuse the prior
  // therapy/condition, but a new explicit topic always takes precedence.
  if (!approaches.length && prior) approaches.push(...matchGroups(prior, APPROACHES));
  if (!conditions.length && prior) conditions.push(...matchGroups(prior, CONDITIONS));
  const wantsReviews = REVIEW_REQUEST.test(text) || (!approaches.length && REVIEW_REQUEST.test(prior));
  const condition = conditions.length ? group(conditions[0].terms) : null;
  const review = wantsReviews ? group(['"systematic review"', '"meta-analysis"']) : null;
  const outcome = matchGroups(text, OUTCOMES)[0] || (prior ? matchGroups(prior, OUTCOMES)[0] : null);
  let queries = [];

  if (approaches.length) {
    // Search for head-to-head evidence first, while retaining individual-arm
    // searches for coverage when direct comparisons are sparse.
    if (approaches.length > 1) {
      queries.push([group(approaches[0].terms), group(approaches[1].terms), condition, review].filter(Boolean).join(' AND '));
    }
    queries.push(...approaches.map(approach =>
      [group(approach.terms), condition, review].filter(Boolean).join(' AND ')));
  } else if (conditions.length && outcome) {
    // Outcome searches need scientific synonyms, not filler such as 'rates people diagnosed'.
    // A broad condition+outcome query ensures we do not overconstrain the index.
    queries = [
      [condition, group(outcome.terms), review].filter(Boolean).join(' AND '),
      [condition, 'mortality', review].filter(Boolean).join(' AND '),
      [condition, '"life expectancy"', review].filter(Boolean).join(' AND ')
    ];
  } else if (conditions.length) {
    const extras = fallbackTerms(text).filter(word => !conditions[0].re.test(word));
    queries = [[condition, extras.length ? extras.slice(0, 2).join(' ') : null, review].filter(Boolean).join(' AND ')];
  } else {
    const terms = fallbackTerms(text);
    queries = [(terms.length ? terms.join(' ') : text.slice(0, 120)) + (review ? ' AND ' + review : '')];
  }
  return [...new Set(queries)].slice(0, 3);
}

export function isSystematicReview(result) {
  return REVIEW_RESULT.test([result?.title, ...(result?.publicationTypes || [])].filter(Boolean).join(' '));
}

function relevanceScore(result, approaches, condition) {
  const title = String(result.title || '').toLowerCase();
  const abstract = String(result.abstract || '').toLowerCase();
  const text = title + ' ' + abstract;
  const matched = approaches.map(approach => approach.terms.some(term =>
    text.includes(term.replace(/"/g, '').toLowerCase())
  ));
  const direct = matched.length > 1 && matched.every(Boolean);
  const review = isSystematicReview(result);
  const comparative = /\\b(?:compar(?:e|ed|ison|ative)|versus|vs\\.?|noninferior|non-inferior|head.to.head|randomi[sz]ed)\\b/i.test(title);
  const conditionMatch = !condition || condition.terms.some(term => text.includes(term.replace(/"/g, '').toLowerCase()));
  return (direct ? 20 : 0) + (review ? 8 : 0) + (comparative ? 5 : 0) +
    (matched.some(Boolean) ? 3 : 0) + (conditionMatch ? 2 : 0) + (result.abstract ? 2 : 0);
}

export function selectResearchEvidence(results, question, maxResults = 6) {
  const valid = (Array.isArray(results) ? results : []).filter(r => r?.title && r?.url);
  const pool = REVIEW_REQUEST.test(String(question || ''))
    ? valid.filter(isSystematicReview)
    : valid;
  const approaches = matchGroups(String(question || ''), APPROACHES);
  const condition = matchGroups(String(question || ''), CONDITIONS)[0];
  const outcome = matchGroups(String(question || ''), OUTCOMES)[0];
  const ranked = pool.map((result, index) => ({ result, index, score: relevanceScore(result, approaches, condition) +
    (outcome && outcome.terms.some(term => (String(result.title || '') + ' ' + String(result.abstract || '')).toLowerCase().includes(term.replace(/"/g, '').toLowerCase())) ? 12 : 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  if (approaches.length < 2) return ranked.slice(0, maxResults).map(item => item.result);

  // Preserve evidence for each requested approach rather than allowing a
  // single heavily indexed approach to consume the entire context budget.
  const selected = [];
  const selectedIds = new Set();
  const add = item => {
    if (!item || selectedIds.has(item.index) || selected.length >= maxResults) return;
    selected.push(item.result);
    selectedIds.add(item.index);
  };
  // Prioritise the best direct comparison, then the best source for each arm.
  add(ranked.find(item => approaches.every(approach =>
    approach.terms.some(term => (String(item.result.title || '') + ' ' + String(item.result.abstract || '')).toLowerCase()
      .includes(term.replace(/"/g, '').toLowerCase()))
  )));
  for (const approach of approaches) {
    add(ranked.find(item => approach.terms.some(term =>
      (String(item.result.title || '') + ' ' + String(item.result.abstract || '')).toLowerCase()
        .includes(term.replace(/"/g, '').toLowerCase())
    )));
  }
  for (const item of ranked) add(item);
  return selected;
}
