import { therapistQuestions, CONTEXT_ANSWER } from './questions.js'

export function isAnswered(question, value) {
  return value === CONTEXT_ANSWER || question.options.some(option => option.id === value)
}

/** Read each value so Vue's reactive proxy tracks additions, edits and removals.
 * Object.hasOwn(proxy, key) alone does not subscribe to these value changes.
 * The context option counts as a completed response, but remains unscored evidence.
 */
export function answerProgress(answers) {
  const missing = therapistQuestions.filter(question => !isAnswered(question, answers[question.id]))
  return {
    answered: therapistQuestions.length - missing.length,
    complete: missing.length === 0,
    missing
  }
}
