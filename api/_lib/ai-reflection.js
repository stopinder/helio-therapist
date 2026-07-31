export const AI_REFLECTION_PROMPT_VERSION = 'ai-reflection-v1';
export const AI_REFLECTION_MINIMUM_CHARACTERS = 50;
export const AI_REFLECTION_MAX_INPUT_CHARACTERS = 10000;

export const aiReflectionSystemPrompt = `You are a therapist's reflective assistant. Your goal is to support the therapist's own reflective practice.

Core Rules:
1. Provide optional, tentative reflective prompts.
2. DO NOT diagnose the client or therapist.
3. DO NOT make definitive ethical rulings or clinical decisions.
4. DO NOT present inferred themes as facts; distinguish observation from speculation.
5. DO NOT claim the client's motives or mental state are known.
6. DO NOT suggest treatment recommendations or risk assessments.
7. Identify uncertainty and invite the therapist to disagree.
8. Avoid flattering, validating, or reassuring the therapist automatically.
9. Use cautious, tentative language: "You might consider...", "One possibility...", "This could be worth discussing...", "Only you can determine whether this fits...".

Response Format:
You must return structured JSON only with these fields:
- reflective_questions: (max 3) open-ended questions for the therapist.
- possible_themes: (max 3) each with a "theme" and a "reason".
- alternative_perspectives: (max 2) ways to look at the situation differently.
- ethical_considerations: (max 2) neutral themes that may warrant ethical attention.
- learning_points: (max 2) practical professional development opportunities.
- limitations: a brief statement about the limits of this AI-generated support.

Concise responses are required. Nothing you produce replaces clinical judgement or supervision.`;

export function validateAIReflectionResponse(content) {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Basic structural validation
    const requiredFields = [
      'reflective_questions', 
      'possible_themes', 
      'alternative_perspectives', 
      'ethical_considerations', 
      'learning_points', 
      'limitations'
    ];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) return null;
    }

    const toString = (val) => String(val || '');
    const trimAndLimit = (val, limit) => toString(val).trim().substring(0, limit);

    // Apply limits and ensure they are arrays before slicing
    return {
      reflective_questions: Array.isArray(data.reflective_questions) 
        ? data.reflective_questions.slice(0, 3).map(q => trimAndLimit(q, 500)) 
        : [],
      possible_themes: Array.isArray(data.possible_themes) 
        ? data.possible_themes.slice(0, 3).map(t => ({
            theme: trimAndLimit(t?.theme, 100),
            reason: trimAndLimit(t?.reason, 300)
          }))
        : [],
      alternative_perspectives: Array.isArray(data.alternative_perspectives) 
        ? data.alternative_perspectives.slice(0, 2).map(p => trimAndLimit(p, 500)) 
        : [],
      ethical_considerations: Array.isArray(data.ethical_considerations) 
        ? data.ethical_considerations.slice(0, 2).map(e => trimAndLimit(e, 500)) 
        : [],
      learning_points: Array.isArray(data.learning_points) 
        ? data.learning_points.slice(0, 2).map(l => trimAndLimit(l, 500)) 
        : [],
      limitations: trimAndLimit(data.limitations, 500)
    };
  } catch (e) {
    console.error('[AI Reflection] Validation failed');
    return null;
  }
}

export function buildReflectionInput(reflection) {
  const parts = [];
  if (reflection.body) parts.push(`Reflection: ${reflection.body}`);
  if (reflection.theme) parts.push(`Theme: ${reflection.theme}`);
  if (reflection.supervision_question) parts.push(`Supervision Question: ${reflection.supervision_question}`);
  
  return parts.join('\n\n');
}
