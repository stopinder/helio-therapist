import test from 'node:test'
import assert from 'node:assert/strict'
import {
  THERAPEUTIC_STANCE_PROMPT_VERSION,
  therapeuticStanceSystemPrompt,
  validateTherapeuticStanceAIResponse
} from '../api/_lib/therapeutic-stance-report.js'
import { reportSections } from '../src/quiz/therapist/content.js'

test('therapeutic stance prompt is integrative, tentative and source-bound', () => {
  assert.match(THERAPEUTIC_STANCE_PROMPT_VERSION, /integrative-ifs/)
  assert.match(therapeuticStanceSystemPrompt, /integrative lens/i)
  assert.match(therapeuticStanceSystemPrompt, /IFS-informed/i)
  assert.match(therapeuticStanceSystemPrompt, /do not assign or diagnose IFS parts/i)
  assert.match(therapeuticStanceSystemPrompt, /Never infer trauma history, diagnosis, attachment style, personality/i)
  assert.match(therapeuticStanceSystemPrompt, /not the scorer/i)
  assert.match(therapeuticStanceSystemPrompt, /client outcomes/i)
  assert.match(therapeuticStanceSystemPrompt, /modality/i)
})

test('AI response validator accepts only the exact report section contract', () => {
  const report = {
    sections: reportSections.map(section => ({
      ...section,
      paragraphs: [`A tentative reflection for ${section.title.toLowerCase()}.`]
    }))
  }
  assert.deepEqual(validateTherapeuticStanceAIResponse(JSON.stringify({ report })), report)
  assert.equal(validateTherapeuticStanceAIResponse(JSON.stringify({ report, extra: true })), null)
  assert.equal(validateTherapeuticStanceAIResponse(JSON.stringify({ report: { sections: report.sections.slice(1) } })), null)
  assert.equal(validateTherapeuticStanceAIResponse('not-json'), null)
})
