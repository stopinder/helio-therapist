import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { askHeliosClinicalSystemPrompt, buildAskHeliosClinicalInput, ASK_HELIOS_CLINICAL_PROMPT_VERSION } from '../api/_lib/ask-helios-clinical.js';

const assist = await readFile(new URL('../api/ai/assist.js', import.meta.url), 'utf8');
const syntheticCases = [
  {query:'What pattern is emerging?', evidence:'Across three sessions, fictional client withdraws after criticism but stays present when invited to slow down.'},
  {query:'What am I missing?', evidence:'A fictional client describes numbness and cannot access early autobiographical detail; do not invent memories or causes.'},
  {query:'How might I understand this relational exchange?', evidence:'A fictional couple reports escalating accusations and silence, with no established psychological diagnosis.'}
];
test('clinical quality prompt has a tracked revision and direct, non-formulaic reasoning contract', () => {
  assert.equal(ASK_HELIOS_CLINICAL_PROMPT_VERSION, 'ask-helios-clinical/2.3.0');
  const prompt=askHeliosClinicalSystemPrompt('integrative');
  for (const instruction of ['Begin with a clear, specific answer','moment','secondary summaries','not independent corroboration','one discriminating alternative','120–220 words','Do not claim to be a human clinician']) {
    assert.ok(prompt.includes(instruction), instruction);
  }
});
test('IFS, TA and CBT prompts provide meaningfully different reasoning instructions, not cosmetic labels', () => {
  const ifs=askHeliosClinicalSystemPrompt('internal_family_systems');
  const ta=askHeliosClinicalSystemPrompt('transactional_analysis');
  const cbt=askHeliosClinicalSystemPrompt('gentle_cbt');
  assert.match(ifs,/Self-led awareness/);
  assert.match(ta,/Parent\/Adult\/Child/);
  assert.match(cbt,/maintaining cycles/);
  assert.match(ta,/Do not use IFS-specific/);
  assert.match(ifs,/Do not impose TA/);
  assert.notEqual(ifs,ta);
  assert.notEqual(ifs,cbt);
});
test('synthetic clinical questions stay separate from source evidence and chosen lens',()=>{
  for(const item of syntheticCases){
    const encoded=buildAskHeliosClinicalInput({
      query:item.query,lens:'transactional_analysis',context:{
        window:'last_three',anchorSessionId:'synthetic-session',
        client:{currentFocus:'Notice the recurring moment.'},care:[],
        sources:[{id:'fictional:1',sessionId:'synthetic-session',occurredAt:'2026-11-01',sourceType:'reviewed_capture',content:item.evidence}]
      }
    });
    const parsed=JSON.parse(encoded);
    assert.equal(parsed.therapistQuestion,item.query);
    assert.equal(parsed.sessionEvidence[0].content,item.evidence);
    assert.equal(parsed.selectedPerspective,'transactional_analysis');
  }
});
test('Reflect instructions remain first-person, exploratory, non-diagnostic and concise',()=>{
  for(const phrase of ['moment-by-moment experience','one fresh but tentative possibility','rather than prescriptive','at most one focused']){
    assert.ok(assist.includes(phrase),phrase);
  }
  assert.match(assist,/ask-helios-reflect\/1\.1\.0/);
});
