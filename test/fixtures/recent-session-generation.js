// Synthetic transport fixtures only. These are not clinical model evaluations.
import { SUMMARY_MODALITIES } from '../../src/lib/summaryModalities.js';
import { completed } from './modality-intelligence.js';
export const RECENT_CLIENT_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const RECENT_USER_ID='ffffffff-ffff-4fff-8fff-ffffffffffff';
export const RECENT_CASES=Object.freeze([
  {date:'2026-01-03T10:00:00Z',line:'Partner A: I\u2019m not ready\u2014not yet. Partner B: We paused without deciding who was right.',sentence:'You described pausing without deciding who was right.'},
  {date:'2026-01-02T10:00:00Z',line:'Partner B: My stomach tightened before I asked for clarification. Partner A: Slowing down helped me hear the question.',sentence:'You noticed bodily tension and found that slowing down helped you hear a question.'},
  {date:'2026-01-01T10:00:00Z',line:'Partner A: We each took a turn describing the misunderstanding. Partner B: I still need time before discussing the next plan.',sentence:'You each described the misunderstanding, while a next plan remained unresolved.'}
]);
export function recentSessionFixture() {
  const sessions=RECENT_CASES.map((item,i)=>({id:`0000000${i+1}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`,user_id:RECENT_USER_ID,client_id:RECENT_CLIENT_ID,occurred_at:item.date}));
  const transcripts=sessions.map((session,i)=>({id:`0000000${i+1}-cccc-4ccc-8ccc-cccccccccccc`,therapist_user_id:RECENT_USER_ID,client_id:RECENT_CLIENT_ID,session_ref:session.id,
    original_transcript:'Synthetic contextual conversation.\r\n'.repeat(2400)+`\r\nRecent-session finding ${i+1}: ${RECENT_CASES[i].line}\r\n`,
    zoom_generated_summary:'Secondary AI note, not independent corroboration.',source_version:1,source_review:{state:'unreviewed'},received_at:session.occurred_at,deleted_at:null}));
  const sources=transcripts.map((row,i)=>({id:'transcript:'+row.id,type:'transcript',text:row.original_transcript,encounterId:row.session_ref,occurredAt:sessions[i].occurred_at,secondary:false}));
  return {sessions,transcripts,pack:{sources,warnings:[],manifest:transcripts.map((row,i)=>({id:row.id,transcriptId:row.id,sessionId:row.session_ref,kind:'zoom_transcript',occurredAt:sessions[i].occurred_at,sourceVersion:1})),snapshot:'synthetic-only',sessionCount:3}};
}
export function recentSessionProvider({lens='gentle_cbt',requests=[],fault=null}={}) {
  return async request=>{
    requests.push(request);
    const input=JSON.parse(request.messages[1].content),schema=request.responseFormat.json_schema.schema;
    if(schema.properties.observations) {
      const observations=[];
      for(const source of input.sources)for(const passage of source.passages) {
        const match=passage.text.match(/Recent-session finding ([1-3]):/);
        if(match)observations.push({id:'e'+(observations.length+1),text:RECENT_CASES[Number(match[1])-1].sentence,kind:'reported_experience',citations:[{passageId:fault==='invalid_reference'?'p-not-in-this-batch':passage.id}]});
      }
      const value={outcome:fault==='needs_review'?'needs_review':'ready',reviewMessage:fault==='needs_review'?'Synthetic source assignment needs checking.':'',reviewEvidence:fault==='needs_review'?observations[0]?.citations||[]:[],observations,priorities:observations.length?[{observationIds:observations.map(o=>o.id),importance:'Reported experience in this source range.'}]:[],gaps:observations.length?[]:['No additional finding in this synthetic range.']};
      const result=completed(value);if(fault==='truncated')result.completion.choices[0].finish_reason='length';return result;
    }
    if(schema.properties.priorities&&!schema.properties.fields)return completed({priorities:input.observations.slice(0,3).map(o=>({observationIds:[o.id],importance:'Retain this dated encounter without merging the partners.'}))});
    if(schema.properties.fields){
      const fields=Object.fromEntries(Object.keys(SUMMARY_MODALITIES[lens].formulation).map(key=>[key,[]]));
      fields[Object.keys(fields)[0]]=input.observations.map(o=>({text:o.text,evidenceIds:[o.id],status:'supported'}));
      return completed({fields,limitations:['Synthetic provider transport fixture; not a clinical quality assessment.']});
    }
    const sections=Object.fromEntries(Object.keys(SUMMARY_MODALITIES[lens].sections).map(key=>[key,{body:'',claims:[]}]));
    const claims=input.observations.map(o=>({text:o.text,evidenceIds:[o.id],status:'observation'}));
    sections[Object.keys(sections)[0]]={body:claims.map(c=>c.text).join(' '),claims};
    return completed({sections,practice:{status:'not_requested',title:'',introduction:'',sequenceBasis:'not_applicable',steps:[],checkInSteps:[],safety:'',clarification:''}});
  };
}
