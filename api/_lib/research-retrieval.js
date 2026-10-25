const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EUROPE_PMC_API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const DEFAULT_TIMEOUT = 8000;

/**
 * Normalizes research metadata from PubMed and Europe PMC.
 */
function normalizeResult(source, raw) {
  if (source === 'pubmed') {
    return {
      id: `pmid:${raw.uid}`,
      title: raw.title,
      authors: (raw.authors || []).map(a => a.name).join(', '),
      journal: raw.fulljournalname || raw.source,
      year: raw.pubdate ? new Date(raw.pubdate).getFullYear() : null,
      doi: raw.elocationid?.startsWith('doi:') ? raw.elocationid.replace('doi: ', '') : null,
      pmid: raw.uid,
      pmcid: raw.articleids?.find(id => id.idtype === 'pmc')?.value,
      url: `https://pubmed.ncbi.nlm.nih.gov/${raw.uid}/`,
      abstract: raw.abstract || null,
      source: 'PubMed'
    };
  } else if (source === 'europepmc') {
    return {
      id: `pmcid:${raw.pmcid || raw.id}`,
      title: raw.title,
      authors: raw.authorString,
      journal: raw.journalTitle,
      year: raw.pubYear,
      doi: raw.doi,
      pmid: raw.pmid,
      pmcid: raw.pmcid,
      url: raw.doi ? `https://doi.org/${raw.doi}` : `https://europepmc.org/article/PMC/${raw.pmcid}`,
      abstract: raw.abstractText || null,
      source: 'Europe PMC'
    };
  }
}

async function fetchWithTimeout(url, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(id);
  }
}

export async function searchResearch(query) {
  try {
    const [pubmedSettled, epcmcSettled] = await Promise.allSettled([
      fetchPubMed(query),
      fetchEuropePMC(query)
    ]);

    const pubmedResults = pubmedSettled.status === 'fulfilled' ? pubmedSettled.value : [];
    const epcmcResults = epcmcSettled.status === 'fulfilled' ? (epcmcSettled.value.resultList?.result || []) : [];

    const pubmedError = pubmedSettled.status === 'rejected' ? pubmedSettled.reason?.message : null;
    const epcmcError = epcmcSettled.status === 'rejected' ? epcmcSettled.reason?.message : null;

    if (pubmedError) console.error('[Research Retrieval] PubMed failed:', pubmedError);
    if (epcmcError) console.error('[Research Retrieval] Europe PMC failed:', epcmcError);

    // If all providers failed, throw to distinguish from "no results found"
    if (pubmedSettled.status === 'rejected' && epcmcSettled.status === 'rejected') {
      const error = new Error('All research providers failed');
      error.status = 502;
      throw error;
    }

    const allResults = [
      ...pubmedResults.map(r => normalizeResult('pubmed', r)),
      ...epcmcResults.map(r => normalizeResult('europepmc', r))
    ];

    // Deduplicate by DOI or PMID/PMCID
    const seen = new Set();
    const unique = allResults.filter(r => {
      const key = (r.doi || r.pmid || r.pmcid || r.title.toLowerCase()).toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 10); // Return top 10 relevant results
  } catch (error) {
    console.error('[Research Retrieval] Critical failure:', error.message);
    return [];
  }
}

async function fetchPubMed(query) {
  // 1. Search for IDs
  const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`;
  const searchData = await fetchWithTimeout(searchUrl);
  const ids = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  // 2. Fetch Summaries & Abstracts
  // Using esummary first for basic metadata
  const summaryUrl = `${PUBMED_API_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const summaryData = await fetchWithTimeout(summaryUrl);
  const summaryResults = summaryData.result || {};
  
  // PubMed abstracts are notoriously hard to get via JSON API. 
  // We'll use efetch with retmode=xml and a simple regex to extract the abstract text.
  const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml&rettype=abstract`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  let abstractMap = {};
  try {
    const resp = await fetch(fetchUrl, { signal: controller.signal });
    if (resp.ok) {
      const xml = await resp.text();
      // Simple regex to extract PMID and AbstractText
      const articles = xml.split('<PubmedArticle>');
      for (const article of articles) {
        const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
        const abstractMatch = article.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/s);
        if (pmidMatch && abstractMatch) {
          abstractMap[pmidMatch[1]] = abstractMatch[1].replace(/<[^>]*>/g, '').trim();
        }
      }
    }
  } catch (e) {
    console.warn('[Research Retrieval] PubMed abstract fetch failed', e.message);
  } finally {
    clearTimeout(id);
  }

  return ids.map(id => {
    const res = summaryResults[id];
    if (res) {
      res.abstract = abstractMap[id] || null;
    }
    return res;
  }).filter(Boolean);
}

async function fetchEuropePMC(query) {
  // Use resultType=core to get abstracts
  const url = `${EUROPE_PMC_API_BASE}/search?query=${encodeURIComponent(query)}&format=json&pageSize=5&resultType=core`;
  return await fetchWithTimeout(url);
}
