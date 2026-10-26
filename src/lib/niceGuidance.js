// Link-only access to the official publisher. This is not a content provider:
// no fetch, scraping, embeddings, LLM input, or guideline text is stored here.
export const NICE_GUIDANCE_URL = 'https://www.nice.org.uk/guidance';
export const NICE_SEARCH_URL = 'https://www.nice.org.uk/search';
export const NICE_TOPIC_MAX_LENGTH = 160;

// Match a named source, never a diagnosis or a list of supported conditions.
// Do not interpret ordinary adjective uses such as "a nice conversation" as NICE.
export function isNiceGuidanceRequest(value) {
  if (typeof value !== 'string' || value.length > 1200) return false;
  const text = value.trim();
  return /\bNICE\b/.test(text)
    || /\bnice(?:['\u2019]s)?\s+(?:guidance|guidelines?|recommendations?|recommends?|recommend|say|says|advise|advises|advice|standards?|website|library|api)\b/i.test(text)
    || /\bnational institute for health and (?:care |clinical )?excellence\b/i.test(text)
    || /\bnice\.org\.uk\b/i.test(text);
}

// Only the explicitly entered topic in the dedicated NICE control goes into
// this URL. Never call this with chat history, a selected client, or a transcript.
export function buildNiceSearchUrl(topic = '') {
  const text = typeof topic === 'string'
    ? topic.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NICE_TOPIC_MAX_LENGTH)
    : '';
  const url = new URL(NICE_SEARCH_URL);
  if (text) url.searchParams.set('q', text);
  return url.toString();
}

export function buildNiceGuidanceReply() {
  return {
    answer: 'You can read NICE guidance on the official NICE website using the links below. '
      + 'To search a topic, use the NICE guidance control above or enter it on NICE itself.\n\n'
      + 'This version of Ask Helios links to NICE; it has not retrieved or read the guideline text and cannot verify or summarise current NICE recommendations. '
      + 'Check the original recommendation, its update date, status, population and setting on NICE.\n\n'
      + 'For a comparison with published studies, ask a separate literature question in Research. '
      + 'A literature answer is not a NICE recommendation. No AI allowance was used for these links.',
    references: [
      { id: 'nice-guidance-library', title: 'Open NICE guidance library', url: NICE_GUIDANCE_URL,
        citation: 'Official NICE website; external link, not a guideline citation.', kind: 'external_guidance' },
      { id: 'nice-guidance-search', title: 'Search on NICE', url: NICE_SEARCH_URL,
        citation: 'Enter a topic on NICE. Guideline content has not been read by Helios.', kind: 'external_guidance' }
    ],
    sourceAccess: { source: 'NICE', mode: 'external-links-only', contentRetrieved: false },
    aiAllowanceUsed: false
  };
}

export function researchReferenceHeading(references = []) {
  return references.length > 0 && references.every(item => item?.kind === 'external_guidance')
    ? 'Official guidance links (not read by Helios)' : 'References';
}
