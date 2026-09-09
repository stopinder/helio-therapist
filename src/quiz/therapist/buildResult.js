import { scoreAnswers } from './scoring.js'
import { dimensions, DISCLAIMER, BOUNDARY_NOTE, REPORT_VERSION, reportSections } from './content.js'

/** Only deterministic rules may introduce observations. The model is a writer, not the scorer. */
export function buildResult(answers) {
  const scored = scoreAnswers(answers)
  const interpreted = scored.dimensionScores.map(score => {
    const definition = dimensions.find(d => d.id === score.id)
    const pole = score.lean ? definition[score.lean] : null
    let summary
    if (score.status === 'insufficient') {
      summary = `There were too few usable responses to describe a tendency in ${definition.label.toLowerCase()}.`
    } else if (score.status === 'mixed') {
      summary = `Your selections in ${definition.label.toLowerCase()} point in different directions across these situations. This is not evidence of either inconsistency or flexibility in practice.`
    } else if (score.status === 'no_lean') {
      summary = `No directional tendency emerged in ${definition.label.toLowerCase()}.`
    } else {
      summary = `In these scenarios, you appear to lean towards ${pole.observation}.`
      if (score.status === 'lean_with_variation') summary += ' Other selections point in a different direction, so this is not a uniform preference.'
    }
    return {
      id: definition.id, label: definition.label, status: score.status,
      lean: score.lean, leanLabel: pole?.label || null,
      summary,
      evidenceCount: score.itemCount,
      availableItems: score.availableItems,
      supportingEvidence: score.lean === 'negative' ? score.negativeEvidence : score.lean === 'positive' ? score.positiveEvidence : [...score.negativeEvidence, ...score.positiveEvidence],
      counterEvidence: score.lean === 'negative' ? score.positiveEvidence : score.lean === 'positive' ? score.negativeEvidence : [],
      possibleStrength: pole?.strength || null,
      possibleTradeoff: pole?.risk || null,
      supervisoryQuestion: pole?.question || `What might account for choosing different approaches in different ${definition.label.toLowerCase()} situations?`
    }
  })

  const leans = scored.dimensionScores.filter(d => d.lean)
  const highest = Math.max(0, ...leans.map(d => Math.abs(d.position)))
  // Keep all equally prominent dimensions. Do not let array order silently select a "type".
  const primaryDimensions = leans.filter(d => Math.abs(d.position) === highest).map(d => d.id)
  const secondaryDimensions = leans.filter(d => Math.abs(d.position) < highest).map(d => d.id)
  const contextualVariations = scored.dimensionScores
    .filter(d => d.status !== 'insufficient' && d.negativeEvidence.length && d.positiveEvidence.length)
    .sort((a, b) => Math.min(b.negativeEvidence.length, b.positiveEvidence.length) - Math.min(a.negativeEvidence.length, a.positiveEvidence.length) || a.id.localeCompare(b.id))
    .slice(0, 2)
    .map(d => ({
      id: `variation_${d.id}`,
      dimension: d.id,
      kind: 'question_not_conclusion',
      description: `You selected contrasting approaches to ${dimensions.find(x => x.id === d.id).label.toLowerCase()} in different scenarios. A useful question is what changes between those situations, not whether one response is the correct one.`,
      evidenceIds: [...d.negativeEvidence, ...d.positiveEvidence]
    }))

  const integrations = []
  const has = (id, lean) => interpreted.some(d => d.id === id && d.lean === lean)
  if (has('structure', 'negative') && has('direction', 'positive')) integrations.push({
    id: 'structured_and_client_led',
    description: 'Agreed structure and client-led direction appear together. They can support one another: a shared frame can hold a direction the client has chosen. Do not describe the combination as inherently contradictory.',
    dimensions: ['structure', 'direction']
  })
  if (has('mode', 'positive') && has('structure', 'negative')) integrations.push({
    id: 'bounded_experiential_work',
    description: 'Experiential exploration and agreed structure appear together. A bounded invitation can make room for immediate experience without requiring the whole session to be unplanned.',
    dimensions: ['mode', 'structure']
  })
  if (has('meaning', 'negative') && has('direction', 'positive')) integrations.push({
    id: 'interpretation_with_client_authorship',
    description: 'Tentative interpretation and client-led direction appear together. Offering an idea and leaving the client room to choose are not opposites. Whether an idea is genuinely revisable is an appropriate reflective question, not a finding about this therapist.',
    dimensions: ['meaning', 'direction']
  })

  const themes = [
    { questionId: 'q02', id: 'diagnostic_conversation', scope: 'Only describes the selected starting point for one diagnostic conversation. It does not establish a diagnostic or de-pathologising ideology.' },
    { questionId: 'q07', id: 'working_with_a_hypothesis', scope: 'Only describes how the selected response uses a tentative hypothesis. All options allow uncertainty; do not infer superior tolerance of uncertainty.' },
    { questionId: 'q06', id: 'receiving_credit', scope: 'Only describes what the selected response seeks to understand after receiving credit. Do not infer modesty, defensiveness, motives or personality.' }
  ].flatMap(theme => {
    const evidence = scored.evidence.find(e => e.questionId === theme.questionId)
    return evidence ? [{ ...theme, evidenceId: evidence.id, observation: evidence.selectedApproach }] : []
  })

  return {
    quizVersion: scored.quizVersion,
    reportVersion: REPORT_VERSION,
    exercise: 'What kind of therapist are you?',
    disclaimer: DISCLAIMER,
    boundaries: BOUNDARY_NOTE,
    basis: 'Self-selected responses to hypothetical practice situations. No observation of actual competence or client outcomes.',
    dimensions: interpreted,
    primaryDimensions,
    secondaryDimensions,
    themes,
    contextualVariations,
    integrations,
    evidence: scored.evidence,
    limitations: [
      'The questions, weights and interpretation rules are provisional editorial choices, not a validated psychometric model.',
      'Tendencies describe these responses, not a fixed identity. A midpoint can reflect contrasting selections; it is not proof of flexibility.',
      'Possible strengths, trade-offs and client experiences are invitations to check in practice, not observed facts.',
      'No conclusion about diagnosis, trauma, attachment style, personal history, competence or modality suitability is supported.'
    ],
    omittedQuestions: scored.skippedQuestions,
    sufficientForNarrative: interpreted.filter(d => d.status !== 'insufficient').length >= 3
  }
}

/** No network call and no invented profile: useful when AI is disabled, unavailable or declined. */
export function buildFallbackReport(result) {
  const observed = result.dimensions.filter(d => d.status !== 'insufficient')
  const leans = observed.filter(d => d.lean)
  const selected = result.primaryDimensions.length ? leans.filter(d => result.primaryDimensions.includes(d.id)) : []
  const strengths = leans.map(d => d.possibleStrength)
  const tradeoffs = leans.map(d => d.possibleTradeoff)
  const noLean = 'These answers do not provide a sufficiently clear overall lean. There is no default therapist type to assign.'
  const body = {
    stance: selected.length ? selected.map(d => d.summary) : [noLean],
    work: observed.length ? observed.map(d => d.summary) : ['There is not enough usable evidence to describe how you tend to work. The context option is not scored as a neutral personality trait.'],
    expertise: result.themes.length ? result.themes.map(t => `In the scenario concerning ${t.id.replaceAll('_', ' ')}, you chose: “${t.observation}” ${t.scope}`) : ['Your responses do not establish a particular relationship with expertise.'],
    clients: ['No client has contributed to this exercise. How clients experience your work would need to be explored with them; these answers cannot establish it.'],
    strengths: strengths.length ? strengths : ['No particular strength is established by the available responses. This is not a judgement about your competence.'],
    tensions: result.contextualVariations.length ? result.contextualVariations.map(t => t.description) : ['No cross-scenario contrast has been selected for this reflection. That does not establish that your practice is free of tensions.'],
    limits: tradeoffs.length ? tradeoffs : ['A useful starting point is to ask which situations make your usual approach less helpful and what tells you to adjust it.'],
    supervision: observed.length ? observed.slice(0, 4).map(d => d.supervisoryQuestion) : ['Which recent session would help me describe how I actually work, rather than how I hope to work?'],
    identity: selected.length ? [`A possible description, limited to these scenarios, would emphasise ${selected.map(d => d.leanLabel).join(', ')}. Treat this as a sentence to revise, not a type to adopt.`] : [noLean]
  }
  return { sections: reportSections.map(section => ({ ...section, paragraphs: body[section.id] })) }
}
