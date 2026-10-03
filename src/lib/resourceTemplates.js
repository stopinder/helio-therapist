import { FORM_SCHEMA } from './resourceForms.js'

export function thoughtRecordDefinition() {
  return {
    schema: FORM_SCHEMA,
    template: 'cbt_thought_record',
    version: 1,
    introduction: 'Take a little time to notice what happened, what went through your mind, and whether another perspective is possible.',
    items: [
      { id: 'situation', type: 'long_text', label: 'Situation', help: 'What happened? Where were you? Who was there?', required: true, maxLength: 3000 },
      { id: 'emotions', type: 'long_text', label: 'Emotions', help: 'What did you notice emotionally or physically?', required: true, maxLength: 2000 },
      { id: 'emotion_intensity', type: 'scale', label: 'How strong was the emotion?', help: '0 means not present; 100 means as strong as you can imagine.', min: 0, max: 100, step: 10, required: true },
      { id: 'automatic_thoughts', type: 'long_text', label: 'Automatic thoughts', help: 'What went through your mind at the time?', required: true, maxLength: 3000 },
      { id: 'evidence_for', type: 'long_text', label: 'What supports that thought?', help: 'Note the facts that seem to support it.', required: false, maxLength: 3000 },
      { id: 'evidence_against', type: 'long_text', label: 'What does not support that thought?', help: 'What facts, context or alternative explanations might matter?', required: false, maxLength: 3000 },
      { id: 'balanced_perspective', type: 'long_text', label: 'A more balanced perspective', help: 'What would be a fairer or more useful way of seeing the situation?', required: true, maxLength: 3000 },
      { id: 'emotion_intensity_after', type: 'scale', label: 'How strong is the emotion now?', min: 0, max: 100, step: 10, required: true },
      { id: 'next_step', type: 'long_text', label: 'What would you like to do next?', required: false, maxLength: 2000 }
    ]
  }
}

export const resourceTemplates = {
  thought_record: {
    title: 'CBT thought record',
    resourceKind: 'thought_record',
    completionMode: 'complete_in_helio',
    audience: 'client',
    description: 'A structured CBT worksheet for noticing situations, thoughts, emotions and alternative perspectives.',
    formDefinition: thoughtRecordDefinition(),
    scoringDefinition: {}
  }
}
