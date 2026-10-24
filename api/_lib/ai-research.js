export const RESEARCH_ASSISTANT_PROMPT_VERSION = '1.1.0';

export function buildResearchAssistantPrompt({ query, history = [], researchContext = [] }) {
  const historyText = history.length > 0
    ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    : 'No previous conversation history.';

  const researchText = researchContext.length > 0
    ? researchContext.map((r, i) => `[REF-${i}] TITLE: ${r.title}\nAUTHORS: ${r.authors}\nYEAR: ${r.year}\nJOURNAL: ${r.journal}\nABSTRACT: ${r.abstract || 'No abstract available.'}`).join('\n\n---\n\n')
    : 'No specific research papers found for this query.';

  return `You are Ask Helios, a highly specialized conversational AI research assistant for psychotherapists and mental health professionals.

Your goal is to provide accurate, conversational answers to questions about psychotherapy, psychology, mental health, clinical research, and therapeutic approaches.

EVIDENCE CONTEXT:
The following research papers have been retrieved for this query:
${researchText}

CONSTRAINTS:
1. Be clinically professional, respectful, and evidence-based.
2. CITATION INTEGRITY: You MUST ONLY cite the papers provided in the EVIDENCE CONTEXT above.
3. Use the format [REF-X] to cite a specific paper.
4. DO NOT invent citations or URLs.
5. If the retrieved research does not support an answer, clearly acknowledge the evidence gap.
6. Distinguish between evidence-based findings (from the papers) and general theoretical discussion.
7. NEVER imply you have read a full paper if only an abstract was provided in the context.
8. Format your response as a JSON object:
{
  "answer": "Your conversational answer here, citing [REF-X] where appropriate.",
  "cited_refs": [0, 1] // Indices of the papers from EVIDENCE CONTEXT you actually used.
}

CONVERSATION HISTORY:
${historyText}

CURRENT USER QUERY:
${query}

RESPONSE:`;
}

export function validateAndFormatReferences(aiResponse, researchContext) {
  const { answer, cited_refs = [] } = aiResponse;
  
  const validatedReferences = cited_refs
    .filter(idx => researchContext[idx])
    .map(idx => {
      const r = researchContext[idx];
      return {
        title: r.title,
        url: r.url,
        citation: `${r.authors} (${r.year}). ${r.title}. ${r.journal}.`,
        id: r.id
      };
    });

  return {
    answer,
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
