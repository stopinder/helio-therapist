import { therapistQuestions, CONTEXT_ANSWER, QUIZ_VERSION } from './questions.js'
import { dimensions } from './content.js'

export class QuizInputError extends Error {
  constructor(message) { super(message); this.name = 'QuizInputError' }
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
}

/** Validate IDs, not a client-supplied psychological profile. No unknown fields are accepted. */
export function validateAnswers(answers) {
  if (!isPlainObject(answers)) throw new QuizInputError('Answers must be an object.')
  const keys = Object.keys(answers)
  if (keys.length !== therapistQuestions.length || keys.some(id => !therapistQuestions.some(q => q.id === id))) {
    throw new QuizInputError('Please respond to every question, using the context option where needed.')
  }
  for (const question of therapistQuestions) {
    if (!Object.hasOwn(answers, question.id)) throw new QuizInputError('A question is missing.')
    const choice = answers[question.id]
    if (typeof choice !== 'string' || (choice !== CONTEXT_ANSWER && !question.options.some(o => o.id === choice))) {
      throw new QuizInputError('An answer is not recognised. Please reload the questionnaire.')
    }
  }
  return answers
}

/** Pure and deterministic. Numeric positions are internal editorial calculations, not clinical scores. */
export function scoreAnswers(input) {
  const answers = validateAnswers(input)
  const evidence = []
  const skippedQuestions = []
  // Iterate in content order so object insertion order cannot change a result.
  for (const question of therapistQuestions) {
    const option = question.options.find(o => o.id === answers[question.id])
    if (!option) { skippedQuestions.push(question.id); continue }
    evidence.push({
      id: `${question.id}.${option.id}`,
      questionId: question.id,
      scenario: question.title,
      selectedApproach: option.text
    })
  }

  const dimensionScores = dimensions.map(dimension => {
    let total = 0
    let availableWeight = 0
    const positiveEvidence = []
    const negativeEvidence = []
    const neutralEvidence = []
    let availableItems = 0
    for (const question of therapistQuestions) {
      const possibleWeights = question.options.map(o => o.weights[dimension.id] || 0)
      const capacity = Math.max(...possibleWeights.map(Math.abs))
      if (!capacity) continue
      availableItems += 1
      const option = question.options.find(o => o.id === answers[question.id])
      if (!option) continue // Context/uncertain is missing evidence, not a midpoint.
      const weight = option.weights[dimension.id] || 0
      availableWeight += capacity
      total += weight
      const ref = `${question.id}.${option.id}`
      if (weight > 0) positiveEvidence.push(ref)
      else if (weight < 0) negativeEvidence.push(ref)
      else neutralEvidence.push(ref)
    }
    const itemCount = positiveEvidence.length + negativeEvidence.length + neutralEvidence.length
    const position = availableWeight ? total / availableWeight : 0
    const hasBothPoles = positiveEvidence.length > 0 && negativeEvidence.length > 0
    let status = 'insufficient'
    let lean = null
    if (itemCount >= 3) {
      if (Math.abs(position) <= 0.25) status = hasBothPoles ? 'mixed' : 'no_lean'
      else {
        lean = position < 0 ? 'negative' : 'positive'
        status = hasBothPoles ? 'lean_with_variation' : 'consistent_choices'
      }
    }
    return {
      id: dimension.id, total, availableWeight, position, itemCount, availableItems,
      status, lean, positiveEvidence, negativeEvidence, neutralEvidence
    }
  })

  return { quizVersion: QUIZ_VERSION, evidence, skippedQuestions, dimensionScores }
}
