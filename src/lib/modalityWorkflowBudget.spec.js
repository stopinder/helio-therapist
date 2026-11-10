import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const {create,insert}=vi.hoisted(()=>({create:vi.fn(),insert:vi.fn()}));
vi.mock('openai',()=>({default:class {constructor(options){this.options=options;this.chat={completions:{create}}}}}));
vi.mock('../../api/_lib/supabase.js',()=>({getSupabaseClient:()=>({from:()=>({insert})})}));
vi.mock('../../api/_lib/ai-budget.js',()=>({FREE_AI_MAX_OUTPUT_TOKENS:1000,FREE_AI_TEXT_MODEL:'synthetic-free-model',reserveAiBudget:vi.fn()}));
import {reserveAiBudget} from '../../api/_lib/ai-budget.js';
import {createTextAIWorkflow,runTextAI,AI_FEATURES} from '../../api/_lib/ai-execution.js';
const feature=AI_FEATURES.CLIENT_SESSION_SUMMARY;
const request={messages:[{role:'user',content:'Synthetic material only.'}],maxTokens:100,responseFormat:{type:'json_object'}};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('OPENAI_API_KEY','synthetic-test-token-not-a-real-key');reserveAiBudget.mockResolvedValue(null);create.mockResolvedValue({choices:[{finish_reason:'stop',message:{content:'{}'}}],usage:{prompt_tokens:5,completion_tokens:4,total_tokens:9}});insert.mockResolvedValue({error:null});});
afterEach(()=>vi.unstubAllEnvs());
describe('bounded multi-stage AI reservation',()=>{
 it('validates allowance once for the whole workflow and records per-stage usage without source text',async()=>{
  const run=await createTextAIWorkflow({feature,userId:'synthetic-user',maxCalls:2,maxInputChars:2000,maxOutputTokens:200});await run(request);await run(request);expect(reserveAiBudget).toHaveBeenCalledTimes(1);expect(reserveAiBudget).toHaveBeenCalledWith({userId:'synthetic-user',feature,requestChars:2000,maxOutputTokens:200});expect(create).toHaveBeenCalledTimes(2);expect(insert).toHaveBeenCalledTimes(2);expect(JSON.stringify(insert.mock.calls)).not.toContain('Synthetic material');
 });
 it('rejects a third call rather than silently creating more provider work',async()=>{
  const run=await createTextAIWorkflow({feature,userId:'synthetic-user',maxCalls:2,maxInputChars:2000,maxOutputTokens:300});await run(request);await run(request);await expect(run(request)).rejects.toMatchObject({code:'AI_WORKFLOW_BUDGET_EXCEEDED'});expect(create).toHaveBeenCalledTimes(2);
 });
 it('fails before any provider request when the existing allowance rejects an extended request',async()=>{
  reserveAiBudget.mockRejectedValue(Object.assign(new Error('Existing short-request cap'),{code:'FREE_AI_INPUT_TOO_LARGE',status:413}));await expect(createTextAIWorkflow({feature,userId:'synthetic-user'})).rejects.toMatchObject({code:'FREE_AI_INPUT_TOO_LARGE'});expect(create).not.toHaveBeenCalled();
 });
 it('cannot use a fabricated permit to bypass allowance checks',async()=>{
  await expect(runTextAI({...request,feature,userId:'synthetic-user',workflowPermit:{}})).rejects.toMatchObject({code:'AI_WORKFLOW_BUDGET_EXCEEDED'});expect(create).not.toHaveBeenCalled();
 });
 it('enforces aggregate output allocation before an over-budget call',async()=>{
  const run=await createTextAIWorkflow({feature,userId:'synthetic-user',maxOutputTokens:100});await run(request);await expect(run(request)).rejects.toMatchObject({code:'AI_WORKFLOW_BUDGET_EXCEEDED'});expect(create).toHaveBeenCalledTimes(1);
 });
});
