
import { searchResearch } from './api/_lib/research-retrieval.js';

async function test() {
  console.log('Testing research retrieval...');
  try {
    const results = await searchResearch('cbt for depression');
    console.log('Results count:', results.length);
    results.forEach((r, i) => {
      console.log(`[${i}] ${r.source} | ${r.id} | ${r.title.substring(0, 60)}...`);
    });
    if (results.length === 0) {
      console.log('FAIL: No results retrieved.');
    } else {
      console.log('PASS: Research retrieved successfully.');
    }
  } catch (err) {
    console.error('FAIL: Error during search:', err);
  }
}

test();
