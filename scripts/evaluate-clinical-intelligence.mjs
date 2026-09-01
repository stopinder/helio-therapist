import OpenAI from 'openai';
import { CLINICAL_INTELLIGENCE_CASES } from '../test/fixtures/clinical-intelligence-evaluation.js';
import { scoreClinicalIntelligenceOutput } from '../test/support/clinical-intelligence-evaluator.js';
import { CLIENT_SESSION_SUMMARY_PROMPT_VERSION, buildClientSessionSummaryInput, clientSessionSummarySystemPrompt, renderClientSessionSummary, validateClientSessionSummaryResponse } from '../api/_lib/ai-client-session-summary.js';

const args=new Set(process.argv.slice(2));
const valueAfter=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null};
const showOutput=args.has('--show-output');
const selectedCase=valueAfter('--case');
const model=valueAfter('--model')||process.env.OPENAI_CLIENT_SUMMARY_MODEL||'gpt-5.6-terra';
if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is required to run the manual Clinical Intelligence benchmark.');
const cases=selectedCase?CLINICAL_INTELLIGENCE_CASES.filter(item=>item.id===selectedCase):CLINICAL_INTELLIGENCE_CASES;
if(!cases.length)throw new Error(`Unknown benchmark case: ${selectedCase}`);
const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:30000});
const results=[];
for(const testCase of cases){
  const validSourceIds=new Set([...testCase.captures.map(item=>`session:${item.sessionId}`),...testCase.careItems.map((item,index)=>`care:${item.id||`${item.kind}:${item.provenance_session_id||'current'}`}`),...(testCase.therapistGuidance?['therapist:guidance']:[])]);
  const completion=await openai.chat.completions.create({model,messages:[{role:'system',content:clientSessionSummarySystemPrompt(testCase.lens)},{role:'user',content:buildClientSessionSummaryInput(testCase)}],response_format:{type:'json_object'},temperature:0.2,max_tokens:2600});
  const structured=validateClientSessionSummaryResponse(completion.choices?.[0]?.message?.content,validSourceIds);
  if(!structured)throw new Error(`${testCase.id}: model returned invalid or ungrounded structured output`);
  const output=renderClientSessionSummary(structured.sections,testCase.lens);
  const score=scoreClinicalIntelligenceOutput(testCase,output);
  results.push({...score,claimCount:structured.claims.length});
  if(showOutput)process.stdout.write(`\n## ${testCase.id}\n${output}\n`);
}
process.stdout.write(`${JSON.stringify({promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION,model,results},null,2)}\n`);
