// Synthetic comparison harness. Default mode checks contracts; --live explicitly
// runs the fixed synthetic case against the configured provider (no database use).
import {writeFile} from 'node:fs/promises';
import OpenAI from 'openai';
import {SUMMARY_MODALITIES} from '../src/lib/summaryModalities.js';
import {assertModalityRegistry,modalityStrategy} from '../api/_lib/modality-intelligence/profiles/index.js';
import {runModalityPipeline} from '../api/_lib/modality-intelligence/pipeline.js';
import {getTextModel,buildTokenLimitParams,buildTemperatureParams,AI_FEATURES} from '../api/_lib/ai-execution.js';
import {SYNTHETIC_MODALITY_CASES,packFixture} from '../test/fixtures/modality-intelligence.js';
assertModalityRegistry();
const live=process.argv.includes('--live');
const caseId=process.argv.find(value=>value.startsWith('--case='))?.slice(7)||SYNTHETIC_MODALITY_CASES[0].id;
const fixture=SYNTHETIC_MODALITY_CASES.find(item=>item.id===caseId);
if(!fixture)throw new Error('Choose a fixed synthetic case. Arbitrary clinical inputs are not accepted by this evaluator.');
const profiles=Object.keys(SUMMARY_MODALITIES);
const rubric=['Does the reasoning follow this modality rather than rename a generic recap?','Are the two or three central priorities preserved?','Are claims faithful to the quoted source, not merely attached to an arbitrary matching quote?','Are hypotheses and unestablished links explicit?','Are practical constraints and ordinary discernment preserved?','Are actual agreements distinct from proposed guidance?','Is the client version useful, accessible and free of therapist-only speculation?'];
const report={kind:live?'synthetic_live_model_comparison':'modality_contract_comparison',modelRun:live,caseId,rubric,notEstablished:'Contract checks do not establish clinical correctness or therapeutic effectiveness.',results:[]};
let calls=0;
const model=getTextModel(AI_FEATURES.CLIENT_SESSION_SUMMARY);
if(live&&!process.env.OPENAI_API_KEY)throw new Error('--live requires provider configuration in the execution environment. Never paste credentials into a prompt.');
const provider=live?new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:55000}):null;
for(const lens of profiles){
 const profile=modalityStrategy(lens);
 if(!live){report.results.push({lens,formulationFields:Object.keys(profile.formulation),clientSections:Object.values(profile.sections),profileVersion:profile.version});continue;}
 try{
  const result=await runModalityPipeline({pack:packFixture(fixture.text),lens,options:{mode:'client_summary'},summaryOptions:{audience:'individual'},requirements:{exercise:false},run:async request=>{if(++calls>20)throw new Error('Synthetic comparison call bound exceeded');return {model,completion:await provider.chat.completions.create({model,messages:request.messages,response_format:request.responseFormat,...buildTokenLimitParams(model,request.maxTokens),...buildTemperatureParams(model,request.temperature)})};}});
  report.results.push({lens,result,requiresHumanReview:true,literalUnsupportedConclusionDetected:result.draft?.body.includes(fixture.excludedConclusion)||false});
 }catch(error){report.results.push({lens,errorCode:error.code||error.name||'UNAVAILABLE',requiresHumanReview:true});}
}
const path=process.argv.find(value=>value.startsWith('--output='))?.slice(9)||'/tmp/helios-modality-comparison.json';
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:path,modelRun:live,profiles:profiles.length,providerCalls:calls,clinicalSignOff:'not_claimed'}));
