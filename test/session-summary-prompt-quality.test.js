import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CLIENT_SESSION_SUMMARY_PROMPT_VERSION, CLIENT_SESSION_SUMMARY_LENSES, clientSessionSummarySystemPrompt, clientSessionSummaryResponseFormat } from '../api/_lib/ai-client-session-summary.js';

const endpoint=await readFile(new URL('../api/ai/client-session-summary.js',import.meta.url),'utf8');
test('session summary prompt revision improves clinical prose without relaxing evidence or therapist review',()=>{
  assert.equal(CLIENT_SESSION_SUMMARY_PROMPT_VERSION,'client-session-summary-v14-therapist-refinement');
  const p=clientSessionSummarySystemPrompt('integrative');
  for(const needle of ['CLINICAL WRITING STANDARD','client\'s reaction or bodily experience','rupture, repair','not independent confirmation','Leave optional sections empty','editable draft for therapist approval','Never cite a source that does not support the claim','Do not infer diagnoses'])assert.ok(p.includes(needle),needle);
});
test('different lenses direct different interpretive reasoning with exactly the same source facts',()=>{
  const ta=clientSessionSummarySystemPrompt('transactional_analysis');
  const ifs=clientSessionSummarySystemPrompt('internal_family_systems');
  const cbt=clientSessionSummarySystemPrompt('gentle_cbt');
  const general=clientSessionSummarySystemPrompt('general');
  assert.deepEqual(CLIENT_SESSION_SUMMARY_LENSES,['general','integrative','gentle_cbt','internal_family_systems','transactional_analysis']);
  assert.match(ta,/crossed transactions/);
  assert.match(ta,/Parent, Adult and Child/);
  assert.match(ta,/Do not import IFS-specific/);
  assert.match(ifs,/unblending/);
  assert.match(cbt,/maintenance cycles/);
  assert.match(general,/model-neutral/);
  assert.notEqual(ta,ifs);
});
test('strict evidence citation schema and generation service remain unchanged',()=>{
  const schema=clientSessionSummaryResponseFormat(['fictional-source-1','fictional-source-2']);
  assert.equal(schema.json_schema.strict,true);
  assert.deepEqual(schema.json_schema.schema.required,['sections','claims']);
  assert.match(endpoint,/validateSummaryOutcome/);
  assert.match(endpoint,/assertSourcesUnchanged/);
  assert.match(endpoint,/summaryOutcomeResponseFormat\(validSourceIds\)/);
  assert.match(endpoint,/promptVersion:CLIENT_SESSION_SUMMARY_PROMPT_VERSION/);
});
