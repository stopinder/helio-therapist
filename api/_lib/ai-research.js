export const RESEARCH_ASSISTANT_PROMPT_VERSION = '1.3.0';

// Fit a useful evidence selection within the 12k-character Free AI input cap.
// Preserve both the introduction and conclusions of longer abstracts.
export function abstractExcerpt(value, maxChars = 1000) {
  const plain = String(value || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
  if (plain.length <= maxChars) return plain;
  const opening = Math.floor(maxChars * 0.42);
  return plain.slice(0, opening) + ' [...] ' + plain.slice(-(maxChars - opening));
}

export function buildResearchAssistantPrompt({ query, history = [], researchContext = [] }) {
  const historyText = history.length > 0
    ? history.slice(-4).map(m => `${String(m.role || 'user').toUpperCase()}: ${String(m.content || '').slice(0, 350)}`).join('\\n\\n')
    : 'No previous conversation history.';

  const researchText = researchContext.length > 0
    ? researchContext.slice(0, 6).map((r, i) => `[REF-${i}] TITLE: ${String(r.title || '').slice(0, 230)}\\nAUTHORS: ${String(r.authors || 'Not supplied').slice(0, 180)}\\nYEAR: ${r.year || 'Not supplied'}\\nJOURNAL: ${String(r.journal || 'Not supplied').slice(0, 110)}\\nPUBLICATION TYPES: ${(r.publicationTypes || []).join(', ').slice(0, 120)}\\nIDENTIFIERS: ${[r.doi, r.pmid, r.pmcid].filter(Boolean).join(', ').slice(0, 150)}\\nABSTRACT EXCERPT: ${abstractExcerpt(r.abstract) || 'No abstract available. The title alone cannot support outcome claims.'}`).join('\\n\\n---\\n\\n')
    : 'No research publications were found for this query.';

  return `You are Ask Helios, a clinical research assistant for psychotherapists.

Base clinical research claims ONLY on the retrieved publications below. An abstract excerpt is not full-text access. Never fabricate a study, effect size, citation, or conclusion.

EVIDENCE CONTEXT:
${researchText}

RULES:
1. Cite supporting publications with [REF-X] using the indices above.
2. Explain study findings, study design, limitations and strength of evidence accurately.
3. If the user asks for systematic reviews, prioritise findings of actual systematic reviews or meta-analyses, not unrelated pilot trials.
4. Never claim that no studies exist merely because the available search context is incomplete.
5. Be explicit when the evidence context lacks the findings needed to answer.
6. Distinguish directly observed abstract findings from your own interpretation.
7. A study without an abstract cannot support claims about results.

Return a JSON object:
{"answer":"Answer with inline [REF-X] references.", "cited_refs":[0,1]}

CONVERSATION HISTORY:
${historyText}

CURRENT USER QUERY:
${String(query || '').slice(0, 800)}`;
}

export function validateAndFormatReferences(aiResponse, researchContext) {
  let { answer = '', cited_refs = [] } = aiResponse;
  
  const validatedReferences = [];
  const validIndices = new Set();

  // 1. Gather all markers from the text to ensure they are included even if AI missed cited_refs
  // Use a strict numeric regex for [REF-X] where X is a series of digits.
  const textMarkers = [...answer.matchAll(/\[REF-(\d+)\]/g)].map(m => parseInt(m[1], 10));
  const allPotentialIndices = new Set([...cited_refs, ...textMarkers]);

  allPotentialIndices.forEach(idx => {
    if (Number.isInteger(idx) && researchContext[idx]) {
      validIndices.add(idx);
      const r = researchContext[idx];
      // Avoid duplicate entries in validatedReferences if both cited_refs and textMarkers have it
      if (!validatedReferences.find(v => v.id === r.id)) {
        validatedReferences.push({
          title: r.title,
          url: r.url,
          citation: `${r.authors} (${r.year}). ${r.title}. ${r.journal}.`,
          id: r.id
        });
      }
    }
  });

  // Scrub any [REF-X] from the answer where X is NOT in our validIndices
  // Also scrub any malformed [REF-X] where X is not purely numeric (e.g. [REF-X], [REF-0abc])
  // We use a capture group to replace the entire [REF-...] marker.
  answer = answer.replace(/\[REF-(.+?)\]/g, (match, p1) => {
    // Only allow purely numeric content inside the brackets
    if (!/^\d+$/.test(p1)) return '';
    const idx = parseInt(p1, 10);
    return validIndices.has(idx) ? match : '';
  });

  // Clean up any double spaces introduced by scrubbing
  answer = answer.replace(/\s\s+/g, ' ');

  return {
    answer: answer.trim(),
    references: validatedReferences
  };
}

export function parseResearchResponse(content) {
  try {
    const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse research response', content, e);
    return {
      answer: content,
      cited_refs: []
    };
  }
}
