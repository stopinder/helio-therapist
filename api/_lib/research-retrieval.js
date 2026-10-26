const PUBMED = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const TIMEOUT = 5000;
let nextPubMedRequest = 0;
const clean = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const decode = value => String(value || '').replace(/&#(x[\da-f]+|\d+);/gi, (match, n) => {
  const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
}).replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n]));

export function parsePubMedAbstracts(xml) {
  const result = {};
  for (const article of String(xml).split(/<PubmedArticle\b[^>]*>/)) {
    const pmid = article.match(/<PMID\b[^>]*>(\d+)<\/PMID>/)?.[1];
    const sections = [...article.matchAll(/<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(m => {
      const label = m[1].match(/\bLabel=["']([^"']+)["']/)?.[1];
      return (label ? decode(label) + ': ' : '') + decode(clean(m[2]));
    });
    if (pmid && sections.length) result[pmid] = sections.join('\n');
  }
  return result;
}

export function normalizeResult(source, raw) {
  if (source === 'pubmed') {
    const doi = raw.articleids?.find(i => i.idtype === 'doi')?.value ||
      (raw.elocationid?.startsWith('doi:') ? raw.elocationid.replace(/^doi:\s*/, '') : null);
    return { id: 'pmid:' + raw.uid, title: decode(clean(raw.title)),
      authors: (raw.authors || []).map(a => a.name).join(', '),
      journal: raw.fulljournalname || raw.source || 'Journal not supplied',
      year: raw.pubdate?.match(/\b(?:19|20)\d{2}\b/)?.[0] || 'Year not supplied',
      publicationTypes: Array.isArray(raw.pubtype) ? raw.pubtype : [], doi, pmid: raw.uid,
      pmcid: raw.articleids?.find(i => i.idtype === 'pmc')?.value,
      url: 'https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(raw.uid) + '/',
      abstract: raw.abstract || null, source: 'PubMed' };
  }
  const pmid = raw.pmid, pmcid = raw.pmcid, doi = raw.doi;
  const types = raw.pubTypeList?.pubType;
  return { id: pmid ? 'pmid:' + pmid : pmcid ? 'pmcid:' + pmcid : String(raw.source || 'MED') + ':' + raw.id,
    title: decode(clean(raw.title)), authors: raw.authorString,
    journal: raw.journalTitle || raw.journalInfo?.journal?.title || 'Journal not supplied',
    year: raw.pubYear || raw.firstPublicationDate?.slice(0, 4) || 'Year not supplied',
    publicationTypes: Array.isArray(types) ? types : types ? [types] : [], doi, pmid, pmcid,
    url: pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(pmid) + '/'
      : pmcid ? 'https://europepmc.org/articles/' + encodeURIComponent(pmcid)
        : doi ? 'https://doi.org/' + encodeURIComponent(doi)
          : 'https://europepmc.org/article/' + encodeURIComponent(raw.source || 'MED') + '/' + encodeURIComponent(raw.id),
    abstract: raw.abstractText ? decode(clean(raw.abstractText)) : null, source: 'Europe PMC' };
}

async function request(url, { signal, fetchImpl = fetch, timeoutMs = TIMEOUT, throttle = true } = {}, json = true) {
  signal?.throwIfAborted();
  if (throttle && url.startsWith(PUBMED)) {
    // NCBI's unauthenticated limit is three requests/second. Coordinate requests
    // in this process too; no silent retries or per-paper parallel fan-out.
    const slot = Math.max(Date.now(), nextPubMedRequest);
    nextPubMedRequest = slot + 360;
    const wait = slot - Date.now();
    if (wait > 0) await new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(signal.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, wait);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    signal?.throwIfAborted();
    const response = await fetchImpl(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    // Bound response bodies as well as request count/time.
    if (Number(response.headers?.get?.('content-length')) > 2000000) throw new Error('Oversize provider response');
    if (!response.text && json) return await response.json(); // lightweight test transport
    const text = await response.text();
    if (text.length > 2000000) throw new Error('Oversize provider response');
    return json ? JSON.parse(text) : text;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort);
  }
}
async function pubmed(query, options) {
  const data = await request(`${PUBMED}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5&sort=relevance&tool=AskHelios`, options);
  if (!Array.isArray(data.esearchresult?.idlist) || data.error) throw new Error('Invalid PubMed response');
  const ids = data.esearchresult.idlist.filter(id => /^\d+$/.test(id)).slice(0, 5);
  if (!ids.length) return { records: [], abstractStatus: 'ok' };
  const summaries = await request(`${PUBMED}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&tool=AskHelios`, options);
  if (!summaries.result) throw new Error('Invalid PubMed metadata');
  let abstracts = {}, abstractStatus = 'ok';
  try {
    abstracts = parsePubMedAbstracts(await request(`${PUBMED}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml&rettype=abstract&tool=AskHelios`, options, false));
  } catch (error) {
    options.signal?.throwIfAborted();
    abstractStatus = 'failed';
  }
  return { records: ids.filter(id => summaries.result[id]).map(id => normalizeResult('pubmed', { ...summaries.result[id], abstract: abstracts[id] || null })), abstractStatus };
}
async function europePMC(query, options) {
  const data = await request(`${EPMC}/search?query=${encodeURIComponent(query)}&format=json&pageSize=5&resultType=core`, options);
  if (!Array.isArray(data.resultList?.result)) throw new Error('Invalid Europe PMC response');
  return { records: data.resultList.result.map(r => normalizeResult('europepmc', r)), abstractStatus: 'ok' };
}

export async function searchResearchDetailed(query, options = {}) {
  if (typeof query !== 'string' || query.length < 3 || query.length > 300) throw new Error('Invalid research query');
  const settled = await Promise.allSettled([pubmed(query, options), europePMC(query, options)]);
  options.signal?.throwIfAborted();
  const batches = settled.map(result => result.status === 'fulfilled' ? result.value.records : []);
  const records = [];
  for (let i = 0; i < Math.max(...batches.map(b => b.length)); i++) for (const b of batches) if (b[i]) records.push(b[i]);
  return { records, providers: settled.map((r, i) => ({
    name: ['PubMed', 'Europe PMC'][i], status: r.status === 'fulfilled' ? 'ok' : 'failed',
    count: r.status === 'fulfilled' ? r.value.records.length : 0,
    abstractStatus: r.status === 'fulfilled' ? r.value.abstractStatus : 'failed'
  })) };
}
// Compatibility for other existing research callers. Main orchestration uses the
// detailed result so partial outages cannot masquerade as an evidence gap.
export async function searchResearch(query) {
  const { records, providers } = await searchResearchDetailed(query);
  if (providers.every(p => p.status === 'failed')) throw Object.assign(new Error('All research providers failed'), { status: 502 });
  const unique = new Map();
  for (const r of records) {
    const key = r.pmid || r.doi?.toLowerCase() || r.pmcid || r.title.toLowerCase();
    const old = unique.get(key);
    if (!old || (r.abstract || '').length > (old.abstract || '').length) unique.set(key, r);
  }
  return [...unique.values()].slice(0, 10);
}
