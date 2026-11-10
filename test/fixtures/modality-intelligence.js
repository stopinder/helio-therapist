import { SUMMARY_MODALITIES } from '../../src/lib/summaryModalities.js';
export const SYNTHETIC_MODALITY_CASES = Object.freeze([
  { id:'boundary-and-choice', text:'The client reported worrying that saying no would upset a colleague. They noticed shoulder tension and agreed to help, then postponed their own work. They described one occasion when they paused and stated their preference. The session did not establish whether pleasing others reduced anxiety.', focus:'A boundary-setting sequence and one exception.', excludedConclusion:'Pleasing always prevents abandonment.' },
  { id:'couple-misunderstanding', text:'One partner heard a comment as rejection and described freezing. The other asked what had been meant. Both paused while the time frame was clarified. They did not agree a plan for future conflicts.', focus:'A misunderstanding, embodied alarm and clarification.', excludedConclusion:'Both partners are equally responsible.' },
  { id:'pause-for-practical-reasons', text:'The client is pausing therapy because of a change in income. They described finding smaller daily actions more useful than pursuing a large distant goal. They may return when their circumstances change. They did not report a diagnosis or a childhood explanation.', focus:'A practical pause and retained resources.', excludedConclusion:'Pausing therapy is avoidance.' }
]);
export const SOURCE_ID='transcript:cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export function packFixture(text=SYNTHETIC_MODALITY_CASES[0].text) {
  return {sources:[{id:SOURCE_ID,type:'transcript',text,encounterId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',occurredAt:'2026-01-01',secondary:false}],warnings:[],manifest:[],snapshot:'synthetic',sessionCount:1};
}
export function evidenceFixture(text=SYNTHETIC_MODALITY_CASES[0].text) {
  const quote=text.split('. ')[0]+'.';
  return {outcome:'ready',reviewMessage:'',reviewEvidence:[],observations:[{id:'e1',text:quote,citations:[{sourceId:SOURCE_ID,quote}],kind:'reported_experience'}],priorities:[{observationIds:['e1'],importance:'Central stated concern.'}],gaps:['The function of the response is not established.']};
}
export function formulationFixture(lens) {
  const fields=Object.fromEntries(Object.keys(SUMMARY_MODALITIES[lens].formulation).map(key=>[key,[]]));
  fields[Object.keys(fields)[0]]=[{text:'The client reported concern about a colleague\'s response.',evidenceIds:['e1'],status:'supported'}];
  return {fields,limitations:['This working account needs therapist review.']};
}
export function compositionFixture(lens) {
  const sections=Object.fromEntries(Object.keys(SUMMARY_MODALITIES[lens].sections).map(key=>[key,{body:'',claims:[]}]));
  const sentence='You described worrying that saying no would upset a colleague.';
  sections[Object.keys(sections)[0]]={body:sentence,claims:[{text:sentence,evidenceIds:['e1'],status:'observation'}]};
  return {sections,practice:{status:'not_requested',title:'',introduction:'',sequenceBasis:'not_applicable',steps:[],checkInSteps:[],safety:'',clarification:''}};
}
export function completed(value) {return {model:'synthetic-test-only',completion:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}};}
