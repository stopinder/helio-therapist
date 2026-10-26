// Explicit public-database connectivity check. No model calls, credentials,
// client information, quota mutations or production database access.
import { searchResearchDetailed } from '../api/_lib/research-retrieval.js';
import { mergeSources } from '../api/_lib/research-queries.js';
const queries = process.argv.slice(2);
if (!queries.length || queries.length > 4) throw new Error('Pass one to four public research searches.');
for (const query of queries) {
  const result = await searchResearchDetailed(query);
  const papers = mergeSources(result.records);
  console.log(JSON.stringify({ query, providers: result.providers, publications: papers.length,
    abstracts: papers.filter(p => p.abstract).length,
    examples: papers.slice(0, 4).map(p => ({ title: p.title, url: p.url, abstractCharacters: (p.abstract || '').length }))
  }));
  if (!papers.some(p => p.abstract)) process.exitCode = 1;
}
