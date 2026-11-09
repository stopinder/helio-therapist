import { describe, expect, it } from 'vitest';
import { effectiveSummaryOptions, summaryInstructionRequirements } from '../../src/lib/summaryAuthoring.js';
import { assessSummaryDraft } from './summary-authoring-policy.js';

const empty = () => ({ outcome: 'ready', sections: {
  opening:'', whatWeWorkedOn:'A real conversation occurred.', patternsOverTime:'',
  changesAndExceptions:'', strengthsAndResources:'', perspectiveReflection:'',
  betweenSession:'', closing:''
}});
const good = () => {
  const draft=empty();
  draft.sections.betweenSession = [
    'Optional exercise to consider',
    '1. Sit comfortably and notice how your feet contact the floor.',
    '2. Bring attention to the sensations within the legs.',
    '3. Notice the hands and allow the arms to be sensed.',
    '4. Bring attention to the pelvis and contact with the chair.',
    '5. Sense the abdomen while leaving the breath natural.',
    '6. Notice your upper body, including chest and spine.',
    '7. Gently sense the neck, head and face.',
    '8. Attempt to sense the whole body while observing attention.',
    'Pause or stop if uncomfortable. This is an adaptation for therapist review.',
    'Somatic check-in',
    'Together, notice your feet and body as you listen to your partner speaking; stop if either feels overwhelmed.'
  ].join('\n');
  return draft;
};
describe('therapist-requested deliverable gate', () => {
  const request='Please provide instructions for the eight-point sensing exercise, point one to eight, and a somatic check-in together.';
  it('promotes free-text exercises even when dropdown remains none', () => {
    const options=effectiveSummaryOptions({addition:'none'},request);
    expect(options.addition).toBe('exercise');
    expect(summaryInstructionRequirements(request,'',options)).toMatchObject({exercise:true,eightPoint:true,somaticCheckIn:true});
  });
  it('keeps incidental discussion of an exercise out of the deliverable pathway', () => {
    expect(effectiveSummaryOptions({addition:'none'},'We discussed the sensing exercise.').addition).toBe('none');
  });
  it('rejects prose that only describes or promises the exercise', () => {
    const options=effectiveSummaryOptions({},request);
    const draft=empty();
    draft.sections.betweenSession='The eight-point sensing exercise can be used for the arms, legs, chest and head, together with a somatic check-in.';
    const issues=assessSummaryDraft(draft,options,summaryInstructionRequirements(request,'',options));
    expect(issues.map(i=>i.code)).toContain('REQUESTED_EXERCISE_MISSING');
    expect(issues.map(i=>i.code)).toContain('REQUESTED_SOMATIC_CHECKIN_MISSING');
  });
  it('requires all eight numbered steps, rather than two', () => {
    const options=effectiveSummaryOptions({},request);
    const draft=good();
    draft.sections.betweenSession=draft.sections.betweenSession.replace(/^8\..*$/m,'');
    expect(assessSummaryDraft(draft,options,summaryInstructionRequirements(request,'',options)).map(i=>i.code)).toContain('REQUESTED_EXERCISE_MISSING');
  });
  it('does not accept merely scheduling a check-in', () => {
    const options=effectiveSummaryOptions({},request);
    const draft=good();
    draft.sections.betweenSession=draft.sections.betweenSession.replace(/Somatic check-in\n[\s\S]*$/,'Somatic check-in\nFind a time to practise.');
    expect(assessSummaryDraft(draft,options,summaryInstructionRequirements(request,'',options)).map(i=>i.code)).toContain('REQUESTED_SOMATIC_CHECKIN_MISSING');
  });
  it('passes an actionable eight-point adaptation and couple check-in', () => {
    const options=effectiveSummaryOptions({},request);
    expect(assessSummaryDraft(good(),options,summaryInstructionRequirements(request,'',options)).filter(i=>i.blocking)).toEqual([]);
  });
});
