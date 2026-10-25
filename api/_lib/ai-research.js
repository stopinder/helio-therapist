export const RESEARCH_ASSISTANT_PROMPT_VERSION = '1.2.0';

export function buildResearchAssistantPrompt({ query, history = [], researchContext = [] }) {
  const historyText = history.length > 0
    ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    : 'No previous conversation history.';

  const researchText = researchContext.length > 0
    ? researchContext.map((r, i) => `[REF-${i}] TITLE: ${r.title}\nAUTHORS: ${r.authors}\nYEAR: ${r.year}\nJOURNAL: ${r.journal}\nSOURCE: ${r.source}\nIDENTIFIERS: ${[r.doi, r.pmid, r.pmcid].filter(Boolean).join(', ')}\nABSTRACT: ${r.abstract || 'No abstract available. Cite with caution based on title only.'}`).join('\n\n---\n\n')
    : 'No research publications were found for this query.';

  return `You are Ask Helios, a specialized clinical AI research assistant for therapists.

Your goal is to answer research questions based EXCLUSIVELY on the provided EVIDENCE CONTEXT.

EVIDENCE CONTEXT:
${researchText}

INSTRUCTIONS:
1. Provide a detailed, conversational answer grounded in the evidence provided.
2. CITATION RULE: Use [REF-X] to cite papers from the EVIDENCE CONTEXT.
3. ABSOLUTE CONSTRAINT: NEVER cite external papers, invent identifiers, or use references not in the list above.
4. If no research is provided, or the research does not cover the question, clearly state that there is an evidence gap.
5. Distinguish clearly between research findings (results, stats, evidence) and theoretical discussion or uncertainty.
6. Acknowledge when you only have an abstract. NEVER imply you have analyzed the full text if not explicitly stated.
7. Be transparent about treatment maturity (e.g., ERP is an established gold standard; IFS for OCD is emerging/theoretical).

JSON RESPONSE FORMAT:
{
  "answer": "Your detailed answer citing [REF-X] where evidence applies.",
  "cited_refs": [indices_of_used_refs],
  "evidence_level": "strong" | "limited" | "theoretical" | "none"
}

CONVERSATION HISTORY:
${historyText}

USER QUERY:
${query}

RESPONSE:`;
}

export function validateAndFormatReferences(aiResponse, researchContext) {
  let { answer = '', cited_refs = [] } = aiResponse;
  
  const validatedReferences = [];
  const validIndices = new Set();

  // 1. Gather all markers from the text to ensure they are included even if AI missed cited_refs
  const textMarkers = [...answer.matchAll(/\[REF-(\d+)\]/g)].map(m => parseInt(m[1], 10));
  const allPotentialIndices = new Set([...cited_refs, ...textMarkers]);

  allPotentialIndices.forEach(idx => {
    if (researchContext[idx]) {
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
  // Also scrub any malformed [REF-X] where X is not a digit (e.g. [REF-X])
  answer = answer.replace(/\[REF-(.+?)\]/g, (match, p1) => {
    const idx = parseInt(p1, 10);
    return (!isNaN(idx) && validIndices.has(idx)) ? match : '';
  });

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
