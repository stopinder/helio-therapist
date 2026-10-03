export const phq9Items = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or watching television',
  'Moving or speaking so slowly that other people could have noticed; or being so fidgety or restless that you have been moving a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way'
]

export const phq9Choices = [
  ['0', 'Not at all'], ['1', 'Several days'], ['2', 'More than half the days'], ['3', 'Nearly every day']
]

export function isPhq9Definition(definition) { return definition?.template === 'phq9' || definition?.instrument === 'PHQ-9' }
export function calculatePhq9(answers) {
  const itemScores = phq9Items.map((_, index) => Number(answers?.[`q${index + 1}`]))
  if (itemScores.some(score => !Number.isInteger(score) || score < 0 || score > 3)) return null
  return { total: itemScores.reduce((sum, score) => sum + score, 0), itemScores, calculationVersion: 'phq-9-v1' }
}
export function phq9Definition() {
  return {
    schema: 'helio-form-v1',
    template: 'phq9',
    instrument: 'PHQ-9',
    version: 1,
    introduction: 'Over the last two weeks, how often have you been bothered by any of the following problems?',
    safety: { itemId: 'q9', triggerValues: ['1', '2', '3'] },
    items: phq9Items.map((label, index) => ({
      id: `q${index + 1}`,
      type: 'single_choice',
      label,
      choices: phq9Choices,
      required: true
    }))
  }
}
