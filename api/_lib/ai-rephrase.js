
export const AI_REPHRASE_PROMPT_VERSION = 'ai-rephrase-v1';

export const aiRephraseSystemPrompt = `You are a therapist's writing assistant. Your goal is to suggest alternative wording for a specific excerpt of a private reflection to improve clarity while retaining the therapist's original meaning and intent.

Core Rules:
1. DO NOT change the core meaning or therapeutic intent.
2. DO NOT add clinical interpretations, diagnoses, or advice.
3. DO NOT remove emotional nuance or uncertainty expressed by the therapist.
4. Keep the tone professional, reflective, and clear.
5. Provide ONLY the rephrased text.
6. If the therapist provided a specific instruction (e.g., "more professional", "clearer", "concise"), respect it.

Response Format:
You must return structured JSON only with these fields:
- rephrased_text: the suggested new wording.
- explanation: a brief (max 1 sentence) explanation of why these changes were suggested.`;

export function validateAIRephraseResponse(content) {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    
    if (!data.rephrased_text) return null;

    const toString = (val) => String(val || '');
    const trimAndLimit = (val, limit) => toString(val).trim().substring(0, limit);

    return {
      rephrased_text: trimAndLimit(data.rephrased_text, 2000),
      explanation: trimAndLimit(data.explanation, 300)
    };
  } catch (e) {
    return null;
  }
}
