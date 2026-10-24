const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EUROPE_PMC_API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest';

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

export async function searchResearch(query) {
  try {
    const [pubmedIds, epcmcResults] = await Promise.all([
      fetchPubMedIds(query),
      fetchEuropePMC(query)
    ]);

    const pubmedDetails = pubmedIds.length > 0 ? await fetchPubMedDetails(pubmedIds) : [];
    
    const allResults = [
      ...pubmedDetails.map(r => normalizeResult('pubmed', r)),
      ...(epcmcResults.resultList?.result || []).map(r => normalizeResult('europepmc', r))
    ];

    // Deduplicate by DOI or PMID/PMCID
    const seen = new Set();
    const unique = allResults.filter(r => {
      const key = r.doi || r.pmid || r.pmcid || r.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 10); // Return top 10 relevant results
  } catch (error) {
    console.error('[Research Retrieval] Failed', error.message);
    return [];
  }
}

async function fetchPubMedIds(query) {
  const url = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.esearchresult?.idlist || [];
}

async function fetchPubMedDetails(ids) {
  const url = `${PUBMED_API_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const resp = await fetch(url);
  const data = await resp.json();
  const results = data.result || {};
  return ids.map(id => results[id]).filter(Boolean);
}

async function fetchEuropePMC(query) {
  const url = `${EUROPE_PMC_API_BASE}/search?query=${encodeURIComponent(query + ' AND (HAS_ABSTRACT:y)')}&format=json&pageSize=5`;
  const resp = await fetch(url);
  return await resp.json();
}
