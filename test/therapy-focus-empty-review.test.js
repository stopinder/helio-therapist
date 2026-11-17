import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCareSuggestionsPrompt, validateCareSuggestions } from '../api/_lib/ai-care-suggestions.js';
import { resolveLensConfig } from '../api/_lib/clinical-lenses.js';
import { CLINICAL_LENSES, getLens, canonicalFocusKind } from '../src/lib/clinicalLenses.js';
const opts={allowedKinds:['shared_understanding'],validSourceIds:new Set(['session:a'])};
const valid={kind:'shared_understanding',body:'A provisional understanding',sourceIds:['session:a']};
test('a failed history proposal can never masquerade as a valid empty review',()=>{
 assert.equal(validateCareSuggestions({suggestions:[{...valid,sourceIds:['invented']}]},opts),null);
 assert.equal(validateCareSuggestions({suggestions:[{...valid,kind:'invented'}]},opts),null);
 assert.equal(validateCareSuggestions({suggestions:[valid,{...valid,sourceIds:[]}]},opts),null);
 assert.deepEqual(validateCareSuggestions({suggestions:[]},opts),[]);
 assert.equal(validateCareSuggestions({suggestions:[valid]},opts).length,1);
});
test('initial formulation does not require an existing improvement or saved Focus entry',()=>{
 const prompt=buildCareSuggestionsPrompt({lensConfig:resolveLensConfig('clinical'),sourceMode:'history',reviewGoal:'fill_empty'});
 assert.match(prompt,/establish provisional starting points/);assert.match(prompt,/Do not require evidence of improvement/);assert.match(prompt,/Do not invent a goal/);
});
test('all five Therapy Focus perspectives share storage kinds and server resolution without CBT fallback',()=>{
 assert.deepEqual(Object.keys(CLINICAL_LENSES),['clinical','integrative','gentle_cbt','internal_family_systems','transactional_analysis']);
 for(const id of Object.keys(CLINICAL_LENSES))assert.deepEqual(resolveLensConfig(id).allowedKinds,Object.keys(getLens(id).sections));
 assert.equal(getLens('general').id,'integrative');assert.equal(resolveLensConfig('unknown').id,'integrative');
 assert.equal(canonicalFocusKind('narrative'),'shared_understanding');assert.equal(canonicalFocusKind('outcomes'),'change_noticed');
});
