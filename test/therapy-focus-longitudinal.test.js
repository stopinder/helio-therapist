import test from 'node:test'
import assert from 'node:assert/strict'
import {focusOverviewItems,focusCoverage,focusEvidenceLabel} from '../src/lib/therapyFocusOverview.js'
import {validateCareSuggestions,buildCareSuggestionsPrompt} from '../api/_lib/ai-care-suggestions.js'
const sections={current_focus:{},shared_understanding:{},trying:{},change_noticed:{},learning:{}}
test('overview preserves change and learning regardless of update order and represents missing evidence honestly',()=>{
 const items=['trying','trying','trying','current_focus','change_noticed','learning'].map((kind,i)=>({id:String(i),kind,status:'current',body:kind}))
 const overview=focusOverviewItems(items,sections)
 assert.equal(overview.length,5)
 assert.ok(overview.find(i=>i.kind==='change_noticed').body)
 assert.ok(overview.find(i=>i.kind==='learning').body)
 assert.equal(overview.find(i=>i.kind==='shared_understanding').empty,true)
 assert.equal(overview.filter(i=>i.kind==='trying').length,1)
 assert.equal(focusOverviewItems([...items,{id:'i',kind:'themes',body:'Context',status:'current'}],sections).at(-1).kind,'themes')
})
test('coverage never implies all recorded sessions were used or that legacy entries have citations',()=>{
 assert.match(focusEvidenceLabel(null),/not recorded/)
 assert.match(focusCoverage([],[]),/No dated history review/)
 const items=[{status:'current',evidence:{coverage:{reviewedAt:'2026-11-14',selectedSessions:1,totalSessions:3,selectedSessionIds:['a']}}}]
 assert.match(focusCoverage(items,[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]),/1 of 3.*3 currently recorded sessions are outside/)
})
test('history suggestions without sources or with fabricated sources are rejected, not relabelled as supported',()=>{
 const valid={kind:'trying',body:'A possibility',sourceIds:['session:a']}
 const result=validateCareSuggestions({suggestions:[valid,{...valid,sourceIds:[]},{...valid,sourceIds:['session:a','session:other-client']}]},{allowedKinds:['trying'],validSourceIds:new Set(['session:a'])})
 assert.equal(result.length,1)
 assert.deepEqual(result[0].sourceIds,['session:a'])
})
test('longitudinal authoring distinguishes agreement, experience, outcome and uncertainty',()=>{
 const prompt=buildCareSuggestionsPrompt({lensConfig:{aiFraming:'General therapy',allowedKinds:Object.keys(sections)},sourceMode:'history'})
 for(const rule of ['chronologically','proposed, agreed, tried','outcome is not recorded','earlier-versus-later','not a future exploration','Do not infer trauma','Leave unsupported sections','session dates'])assert.ok(prompt.includes(rule),rule)
})
