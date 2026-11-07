// One-time reviewed refactor completion. Removed with its publishing workflow before release.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const repo='stopinder/helio-therapist',branch='refactor/global-summary-authoring-20261107';
const paths=['src/components/workspace/ClientDocumentComposer.vue','src/views/SessionWorkspace.vue','api/_lib/documentPdf.js','test/client-session-summary.test.js','test/session-summary-prompt-tuning.test.js','test/session-summary-single-source-recurrence.test.js','test/session-summary-generation-ui.test.js','test/summary-first-workflow.test.js','test/document-tiptap-editor.test.js'];
if(process.argv.includes('--publish')){
 if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=='refs/heads/'+branch||!process.env.GITHUB_TOKEN)throw new Error('Wrong publishing context');
 const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 if(!changed.length||changed.some(path=>!paths.includes(path)))throw new Error('Unexpected source changes');
 async function api(path,method='GET',body){const r=await fetch('https://api.github.com/repos/'+repo+path,{method,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error('Source publication failed '+r.status);return r.json();}
 const head=process.env.GITHUB_SHA,ref=await api('/git/ref/heads/'+branch);if(ref.object.sha!==head)throw new Error('Branch changed');
 const parent=await api('/git/commits/'+head);
 const tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:changed.map(path=>({path,mode:'100644',type:'blob',content:fs.readFileSync(path,'utf8')}))});
 const commit=await api('/git/commits','POST',{message:'Complete shared summary hand-off, linked-resource export and architecture regression tests',tree:tree.sha,parents:[head]});
 if((await api('/git/ref/heads/'+branch)).object.sha!==head)throw new Error('Branch changed');
 await api('/git/refs/heads/'+branch,'PATCH',{sha:commit.sha,force:false});console.log('summary_source_commit='+commit.sha);process.exit(0);
}
const files=new Map(paths.map(path=>[path,fs.readFileSync(path,'utf8')]));
function one(s,a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw new Error('Missing or ambiguous anchor: '+a.slice(0,80));return s.replace(a,b);}
function edit(path,fn){files.set(path,fn(files.get(path)));}
function testBody(s,name,body){const start=s.indexOf("test('"+name+"'");if(start<0)throw new Error('Missing test '+name);let end=s.indexOf('\ntest(',start+5);if(end<0)end=s.length;return s.slice(0,start)+"test('"+name+"',async()=>{\n"+body+'\n});\n'+s.slice(end);}
edit(paths[0],s=>{
 s=one(s,'candidateMatches, summaryContextKey, summaryBodyToRichContent','candidateMatches, summaryContextKey, summaryBodyToRichContent, SUMMARY_SECTION_GROUPS');
 s=s.replace(/^const SESSION_SUMMARY_TEMPLATE = .*$/m,"const SESSION_SUMMARY_TEMPLATE = SUMMARY_SECTION_GROUPS.map(group=>group.heading).join('\\n\\n')");
 s=one(s,'const generatingSummary = ref(false)',"const initialGeneration=props.document?.content?.summaryGeneration || props.document?.content?.clinicalIntelligence?.generation || null\nconst generatingSummary = ref(false)");
 s=one(s,"summaryLens = ref(props.document?.content?.summaryGeneration?.lens || props.document?.content?.clinicalIntelligence?.generation?.lens || 'general')","summaryLens = ref(initialGeneration?.lens || 'general')");
 s=one(s,"summaryWindow = ref(props.document?.content?.summaryGeneration?.window || props.document?.content?.clinicalIntelligence?.generation?.window || 'last_three')","summaryWindow = ref(initialGeneration?.window === 'recent' ? 'last_three' : initialGeneration?.window || 'last_three')");
 s=one(s,'summaryGeneration = ref(props.document?.content?.clinicalIntelligence?.generation || props.document?.content?.summaryGeneration || null)','summaryGeneration = ref(initialGeneration)');
 s=one(s,'anchorSessionId.value = summaryGeneration.value?.anchorSessionId || availableSummarySessions.value[0]?.sessionId || null','anchorSessionId.value = summaryGeneration.value?.anchorSessionId || props.document?.sourceManifest?.find(item=>item.sessionId)?.sessionId || availableSummarySessions.value[0]?.sessionId || null');
 return s;
});
edit(paths[1],s=>one(s,'lens:result.lens||summaryLens.value,window:result.window||summaryWindow.value,sessionCount:', 'lens:result.lens||summaryLens.value,window:result.window||summaryWindow.value,anchorSessionId:session.value.id,sessionCount:'));
edit(paths[2],s=>{
 s="import { SUMMARY_HEADINGS, summaryBodyToRichContent, safeResourceUrl } from '../../src/lib/summaryAuthoring.js';\n"+s;
 const a=s.indexOf('const SUMMARY_HEADINGS=new Set(['),b=s.indexOf('\n]);',a);if(a<0||b<0)throw new Error('PDF heading table missing');s=s.slice(0,a)+s.slice(b+5);
 const insert=String.raw`function richParagraphSegments(node){
  if(node?.type==='hardBreak')return [{text:'\n'}];
  if(node?.type==='text'){
    let href=null;const mark=node.marks?.find(item=>item.type==='link');
    if(mark?.attrs?.href)try{href=safeResourceUrl(mark.attrs.href)}catch{}
    return [{text:text(node.text),href}];
  }
  return (node?.content||[]).flatMap(richParagraphSegments);
}
function renderParagraphSegments(pdf,node,options){
  const parts=richParagraphSegments(node).filter(part=>part.text);
  parts.forEach((part,index)=>pdf.text(part.text,{...options,continued:index<parts.length-1,link:part.href||null,underline:Boolean(part.href)}));
}

`;
 s=one(s,'function renderRichNodes(',insert+'function renderRichNodes(');
 s=one(s,'        pdf.text(value,options);\n      }else{','        renderParagraphSegments(pdf,node,options);\n      }else{');
 s=one(s,"  else renderPlainBody(pdf,text(draft.content?.body||'').trim(),pageWidth);","  else if(isSessionSummary(draft))renderRichNodes(pdf,summaryBodyToRichContent(draft.content?.body||'').content,pageWidth);\n  else renderPlainBody(pdf,text(draft.content?.body||'').trim(),pageWidth);");
 return s;
});
edit(paths[3],s=>{
 s="import { clientSessionSummarySystemPrompt, buildClientSessionSummaryInput } from '../api/_lib/ai-client-session-summary.js';\nimport { SUMMARY_SECTION_GROUPS, summaryBodyToRichContent } from '../src/lib/summaryAuthoring.js';\n"+s;
 s=testBody(s,'Clinical Intelligence prompt separates recurrence from causality and protects client-facing boundaries',String.raw`const prompt=clientSessionSummarySystemPrompt('integrative');
 assert.match(prompt,/recurrence is not causality/i);assert.match(prompt,/Never invent.*diagnoses/);assert.match(prompt,/risk/);assert.match(prompt,/directly reported/);assert.match(prompt,/recurring/);assert.match(prompt,/tentative interpretation/);assert.match(prompt,/Silence is not improvement/i);`);
 s=testBody(s,'Clinical Intelligence quality contract requires staged comparison and evidence thresholds',String.raw`const input=JSON.parse(buildClientSessionSummaryInput({captures:[]}));
 assert.deepEqual(input.reasoningInstructions.sequence,['map evidence by source type','compare reviewed sessions','identify evidence strength','draft client-facing sections']);
 assert.match(input.reasoningInstructions.recurrenceThreshold,/two or more session sources/);assert.match(input.reasoningInstructions.currentObservationRule,/current observation/);assert.match(input.reasoningInstructions.changeRule,/explicit comparative evidence/);
 assert.deepEqual(input.evidenceMap.comparisonTasks,['recurrence','change','stability','exceptions','resources','unfinished_threads','possible_connections']);`);
 s=testBody(s,'Clinical Intelligence prompt gives each client-facing section a distinct job',String.raw`const prompt=clientSessionSummarySystemPrompt('general');
 for(const field of ['opening','whatWeWorkedOn','patternsOverTime','changesAndExceptions','strengthsAndResources','perspectiveReflection','betweenSession','closing'])assert.match(prompt,new RegExp(field+':'));
 assert.match(prompt,/therapist contribution/);assert.match(prompt,/actual agreements/);assert.match(prompt,/Say each important thing once/);assert.match(prompt,/eight storage fields are NOT eight mandatory paragraphs/);assert.equal(SUMMARY_SECTION_GROUPS.length,4);`);
 s=testBody(s,'therapist-authored additions are passed separately and never presented as client statements',String.raw`const input=JSON.parse(buildClientSessionSummaryInput({therapistGuidance:'A therapist-authored correction.'}));
 assert.equal(input.evidenceMap.therapistAuthoredContext.sourceType,'therapist_guidance');assert.equal(input.evidenceMap.therapistAuthoredContext.content,'A therapist-authored correction.');
 assert.match(clientSessionSummarySystemPrompt('general'),/editing instructions are directions, NOT proof that an event occurred/);
 for(const path of ['../api/ai/client-session-summary.js','../src/lib/clientDocuments.js'])assert.match(await read(path),/therapistGuidance/);
 assert.match(await read('../src/components/workspace/ClientDocumentComposer.vue'),/Therapist additions/);`);
 s=testBody(s,'AI returns structured clinical intelligence and Helios renders the client document deterministically',String.raw`const sections={opening:'Work felt uncertain.',whatWeWorkedOn:'We explored the recorded response.',patternsOverTime:'A repeated pattern was reported.',changesAndExceptions:'An exception was reported.',strengthsAndResources:'A specific capacity was demonstrated.',perspectiveReflection:'A tentative interpretation.',betweenSession:'An agreed next step.',closing:'An unfinished question.'};
 const rendered=renderClientSessionSummary(sections,'gentle_cbt');
 for(const value of Object.values(sections))assert.ok(rendered.includes(value));
 for(const group of SUMMARY_SECTION_GROUPS)assert.ok(rendered.includes(group.heading));
 assert.equal(summaryBodyToRichContent(rendered).content.filter(node=>node.type==='heading').length,4);assert.doesNotMatch(rendered,/A gentle CBT perspective/);`);
 s=one(s,'assert.match(composer,/replace your edited draft/i);','assert.match(composer,/candidateMatches/);assert.match(composer,/pendingSummary/);');
 s=one(s,String.raw`assert.match(runner,/temperature:\s*0\.2/);assert.match(runner,/max_tokens:\s*8000/);`,String.raw`assert.match(runner,/buildTemperatureParams\(model,0\.2\)/);assert.match(runner,/buildTokenLimitParams\(model,8000\)/);`);
 return s;
});
edit(paths[4],()=>String.raw`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
test('session summary prompt tuning rules',async t=>{
 const content=clientSessionSummarySystemPrompt('integrative');
 const endpoint=fs.readFileSync('api/ai/session-summary.js','utf8');
 await t.test('includes tentative inference guidance',()=>{assert.match(content,/tentative interpretation/);assert.match(content,/Never invent missing links/);});
 await t.test('includes repetition avoidance guidance',()=>{assert.match(content,/Say each important thing once/);assert.match(content,/remove repetitive descriptions/i);});
 await t.test('keeps section roles and longitudinal boundaries explicit',()=>{assert.match(content,/patternsOverTime: supported recurrence/);assert.match(content,/betweenSession: actual agreements/);assert.match(content,/two or more independent supplied session IDs/);assert.match(content,/Change needs explicit comparative evidence/);});
 await t.test('preserves grounding and evidenceStrength rules for both evidence scopes',()=>{for(const word of ['current_observation','therapist_guidance','tentative_connection'])assert.ok(content.includes(word));assert.match(content,/Cite only supplied source IDs/);assert.match(content,/text appears verbatim/i);assert.match(endpoint,/window === 'recent'/);assert.match(content,/single session, including its report of earlier repeated events/);});
});
`);
edit(paths[5],s=>{
 s="import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';\n"+s;
 return testBody(s,'single-session reported history cannot be labelled cross-session recurrence',String.raw`const prompt=clientSessionSummarySystemPrompt('general');
 assert.match(prompt,/Use current_observation for a single session, including its report of earlier repeated events/);
 assert.match(prompt,/recurring claim must cite two or more independent supplied session IDs/);
 assert.match(direct,/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/);`);
});
edit(paths[6],s=>{
 s="import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';\nconst globalPrompt=clientSessionSummarySystemPrompt('integrative');\n"+s;
 s=one(s,String.raw`/clientSessionSummaryLensRule\(lens\)/`,String.raw`/clientSessionSummarySystemPrompt\(lens,summaryOptions\)/`);
 s=one(s,String.raw`assert.match(apiSource, /EVERY section value must be a JSON string/)`,String.raw`assert.match(globalPrompt, /exactly these string fields/)`);
 s=one(s,String.raw`assert.match(apiSource, /session-summary-direct-v7-summary-first/)`,String.raw`assert.match(apiSource, /SUMMARY_POLICY_VERSION/)`);
 s=one(s,String.raw`const guard = source.match(/async function generateSummary\(\)\s*\{\s*if\s*\(([^\n]+)\)\s*return;/)?.[1]`,String.raw`const guard = source.match(/async function generateSummary\(payload = null\)\s*\{\s*if\s*\(([^\n]+)\)\s*return;/)?.[1]`);
 s=one(s,"new Function('session', 'isGenerating', 'summaryDocument', 'transcript', 'transcriptLoading', 'transcriptError',", "new Function('session', 'isGenerating', 'summaryDocument', 'transcript', 'transcriptLoading', 'transcriptError', 'reviewSaveBusy',");
 s=one(s,'{value:source},{value:loading},{value:error})','{value:source},{value:loading},{value:error},{value:false})');
 return s;
});
edit(paths[7],s=>one(s,String.raw`/excludeEarlierZoomNotes: excludeEarlierZoomNotes\.value/`,String.raw`/excludeEarlierZoomNotes:\s*excludeEarlierZoomNotes\.value/`));
edit(paths[8],s=>{
 s="import { summaryBodyToRichContent } from '../src/lib/summaryAuthoring.js';\n"+s;
 s=one(s,'  assert.match(client, /Different parts of you in this work/)',"  assert.equal(summaryBodyToRichContent('Different parts of you in this work\\n\\nA legacy section.').content[0].type,'heading')");
 s=one(s,'  assert.match(pdf, /Different parts of you in this work/)',"  assert.match(pdf, /summaryBodyToRichContent/)");return s;
});
for(const [path,source]of files)fs.writeFileSync(path,source);
for(const path of paths.filter(path=>path.endsWith('.js')))execFileSync('node',['--check',path],{stdio:'inherit'});
execFileSync('git',['diff','--check'],{stdio:'inherit'});
console.log('Global summary hand-off and regression updates assembled.');
