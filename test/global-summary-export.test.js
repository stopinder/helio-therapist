import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentPdf } from '../api/_lib/documentPdf.js';
import { summaryBodyToRichContent, renderSummarySections, resourceAppendix } from '../src/lib/summaryAuthoring.js';
const resource={title:'Synthetic reference for review',url:'https://example.com/reference',purpose:'Optional information to consider.',reviewed:true};
const body=renderSummarySections({whatWeWorkedOn:'A fictional client described uncertainty during a work conversation.',perspectiveReflection:'The meaning of feedback was explored tentatively, without reaching a settled explanation.',changesAndExceptions:'Pausing became easier. Returning to unfinished conversations remained less consistent.'})+resourceAppendix(resource,{url:resource.url,status:'reachable'});
const draft=content=>({title:'Synthetic summary export verification',document_type:'session_summary',client_name:'Synthetic client',content});
for(const format of ['plain','rich'])test('global '+format+' summary export includes one safe clickable resource, not a raw-URL heading',async()=>{
  const content={body,...(format==='rich'?{richContent:summaryBodyToRichContent(body)}:{})};
  const pdf=await buildDocumentPdf(draft(content));
  assert.ok(Buffer.isBuffer(pdf));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  const bytes=pdf.toString('latin1');assert.match(bytes,/\/Subtype \/Link/);assert.ok(bytes.includes('https://example.com/reference'));
  assert.ok(pdf.length>1500);
});
test('rich export will not create active links with unsafe schemes or private destinations',async()=>{
  const richContent={type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'Unsafe embedded link',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]},
    {type:'text',text:'Private-network link',marks:[{type:'link',attrs:{href:'https://127.0.0.1/private'}}]}
  ]}]};
  const pdf=await buildDocumentPdf(draft({body:'Synthetic unsafe-link regression',richContent}));
  assert.doesNotMatch(pdf.toString('latin1'),/\/Subtype \/Link|\/URI\s*\(/);
});
