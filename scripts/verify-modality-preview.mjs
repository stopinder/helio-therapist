// Real composer + real design tokens, bundled and rendered in memory.
// No navigation, network access, real credentials or clinical data are used.
// This verifies the real pipeline through the real editor and UI, with a controlled
// provider and synthetic recent sessions. It is NOT live-model clinical quality.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {build} from 'vite';
import vue from '@vitejs/plugin-vue';
import {chromium,expect} from '@playwright/test';
import {runModalityPipeline} from '../api/_lib/modality-intelligence/pipeline.js';
import {recentSessionFixture,recentSessionProvider,RECENT_CASES} from '../test/fixtures/recent-session-generation.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const ids=Object.fromEntries(['entry','documents','profile','api'].map(name=>[name,'\0virtual:modality-'+name]));
const documents=`
import {formulationFixture,evidenceFixture,compositionFixture} from '/test/fixtures/modality-intelligence.js';
import {renderModalityDocument} from '/api/_lib/modality-intelligence/contracts.js';
import {modalityStrategy} from '/api/_lib/modality-intelligence/profiles/index.js';
window.modalityFixture={calls:[],writes:[],zoomReads:0,fail:false};
export const listClientSummaryEvidence=async()=>window.recentSessionEvidence();
export const listDocumentSourceSessions=async()=>[];
export const checkSummarySourceSafety=async()=>({safe:true});
export async function generateClientSessionSummary(request){
  window.modalityFixture.calls.push(request);
  const reply=await window.recentSessionPipeline(request,{tooLarge:window.modalityFixture.tooLarge,fail:window.modalityFixture.fail});
  if(!reply.success)throw Object.assign(new Error(reply.error.message),{code:reply.error.code});
  window.modalityFixture.lastResult=reply.data;
  return reply.data;
}
const blocked=async()=>{window.modalityFixture.writes.push('blocked');throw new Error('No writes allowed in the preview fixture');};
export const createClientDocumentDraft=blocked,saveClientDocumentDraft=blocked,downloadClientDocument=blocked,finaliseClientDocument=blocked;
`;
const entry=`import {createApp} from 'vue';import Composer from '/src/components/workspace/ClientDocumentComposer.vue';import '/src/main.css';createApp(Composer,{client:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',display_name:'Synthetic demonstration'},initialDocumentType:'session_summary'}).mount('#fixture');`;
const plugin={name:'local-modality-design-fixture',enforce:'pre',resolveId(source,importer){if(source==='virtual:modality-entry'||source.endsWith('/virtual:modality-entry'))return ids.entry;const path=importer?.replaceAll('\\','/')||'';if(path.endsWith('/ClientDocumentComposer.vue')&&source.endsWith('/lib/clientDocuments.js'))return ids.documents;if(path.endsWith('/ClientDocumentComposer.vue')&&source.endsWith('/lib/documentProfile.js'))return ids.profile;if(source.endsWith('/lib/api.js')||source==='./api.js')return ids.api;},load(id){if(id===ids.entry)return entry;if(id===ids.documents)return documents;if(id===ids.profile)return `export const loadDocumentProfile=async()=>({});export const profileDisplay=()=>({heading:'Helios',contactLines:[],footer:'Synthetic preview - no clinical data'});`;if(id===ids.api)return `export const withSessionRecovery=async fn=>fn();export async function authenticatedFetch(url,options){const request=JSON.parse(options?.body||'{}');if(url==='/api/ai/modality-summary'&&request.action==='sources'){window.modalityFixture.zoomReads++;return new Response(JSON.stringify({success:true,data:{zoomSummaries:[{id:'note',occurredAt:'2026-01-01',text:'This is a synthetic Zoom note. The client discussed saying no to a request. This generated interpretation is not independent corroboration of the original transcript.',needsReview:false}]}}),{headers:{'Content-Type':'application/json'}});}throw new Error('Unexpected request blocked by local preview fixture');}`;},configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url!=='/__modality-preview')return next();try{res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/__modality-preview','<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture"></div><script type="module" src="/@id/__x00__virtual:modality-entry"></script></body></html>'));}catch(e){next(e);}});}};
let server,browser;
const deadline=setTimeout(()=>{console.error('Local modality verification exceeded 120 seconds');process.exit(1)},120000);
try{
 const bundle=await build({root,configFile:false,envFile:false,publicDir:false,define:{'process.env.NODE_ENV':JSON.stringify('production')},logLevel:'error',plugins:[plugin,vue()],build:{write:false,lib:{entry:'virtual:modality-entry',name:'ModalityFixture',formats:['iife']},cssCodeSplit:false,minify:false}});
 const outputs=(Array.isArray(bundle)?bundle:[bundle]).flatMap(item=>item.output);const javascript=outputs.filter(item=>item.type==='chunk').map(item=>item.code).join('\n');const css=outputs.filter(item=>item.type==='asset'&&item.fileName.endsWith('.css')).map(item=>item.source).join('\n').replace(/@import[^;]+;/g,''); // External font imports are omitted only in the network-free QA harness.
 browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
 const out=process.env.MODALITY_SCREENSHOT_DIR||'test-results/modality-preview';await mkdir(out,{recursive:true});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport});await context.route('**/*',route=>route.abort());const page=await context.newPage();
  const fixture=recentSessionFixture();
  await page.exposeFunction('recentSessionEvidence',()=>fixture.sessions.map(session=>({sessionId:session.id,occurredAt:session.occurred_at,sourceType:'original_encounter'})));
  await page.exposeFunction('recentSessionPipeline',async(request,faults)=>{
    try{
      assert.equal(request.window,'last_three');
      assert.equal(request.anchorSessionId,fixture.sessions[0].id);
      if(faults.tooLarge)throw Object.assign(new Error('Selection exceeds the bounded review capacity. No source text has been dropped.'),{code:'EVIDENCE_WINDOW_TOO_LARGE'});
      const requests=[];
      const result=await runModalityPipeline({pack:fixture.pack,lens:request.lens,options:request.intelligenceOptions,summaryOptions:{audience:'shared'},requirements:{exercise:false},run:recentSessionProvider({lens:request.lens,requests,fault:faults.fail?'invalid_reference':null})});
      assert.equal(result.architecture.evidenceCoverage.batchCount,3);
      assert.equal(result.architecture.evidenceCoverage.allSelectedTextSubmitted,true);
      for(const evidence of result.formulation.evidence)for(const citation of evidence.citations){
        const source=fixture.pack.sources.find(item=>item.id===citation.sourceId);
        assert.ok(source.text.includes(citation.quote));
        assert.equal(citation.occurredAt,source.occurredAt);
      }
      return {success:true,data:{...result,sources:fixture.pack.manifest,sessionCount:3,lens:request.lens,window:request.window,generationId:'synthetic-generation',generatedAt:'2026-01-03',promptVersion:'synthetic-provider-only',reviewRequired:true}};
    }catch(error){return {success:false,error:{code:error.code||'TEST_FAILURE',message:error.message}};}
  });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="fixture"></div></body></html>');await page.addStyleTag({content:css});await page.addScriptTag({content:javascript});await expect(page.getByTestId('clinical-intelligence-controls')).toBeVisible().catch(async error=>{console.error(JSON.stringify({errors,text:await page.locator('body').innerText()}));throw error;});
  const perspective=page.locator('select').filter({has:page.locator('option[value="gentle_cbt"]')});await perspective.selectOption('gentle_cbt');await expect(page.getByText('CBT pathway')).toBeVisible();assert.equal(await page.evaluate(()=>window.modalityFixture.zoomReads),0);
  await page.getByTestId('summary-zoom-preview').locator('summary').click();await expect(page.getByText('This is a synthetic Zoom note.',{exact:false})).toBeVisible();await page.getByLabel('Include these Zoom notes as secondary context',{exact:false}).check();
  await page.getByRole('button',{name:'Generate client summary',exact:true}).click();await expect(page.locator('.tiptap')).toContainText('Understanding the pattern');for(const item of RECENT_CASES)await expect(page.locator('.tiptap')).toContainText(item.sentence);assert.equal(await page.evaluate(()=>window.modalityFixture.calls.at(-1).intelligenceOptions.includeZoomSummary),true);
  await page.getByRole('radio',{name:/Therapist formulation/}).check();await page.getByRole('button',{name:'Prepare therapist formulation',exact:true}).click();await expect(page.getByTestId('therapist-formulation')).toBeVisible();await expect(page.getByRole('button',{name:'Save Draft',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Finalise PDF',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy therapist formulation',exact:true})).toBeDisabled();
  await page.getByTestId('clinical-intelligence-controls').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page must not overflow');const controls=page.getByTestId('clinical-intelligence-controls');assert.ok(await controls.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'controls fit viewport');
  await page.screenshot({path:out+'/controls-'+viewport.width+'.png',fullPage:true});await page.getByTestId('therapist-formulation').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/formulation-'+viewport.width+'.png',fullPage:true});
  await page.getByRole('radio',{name:/Client summary/}).check();await expect(page.locator('.tiptap')).toContainText('Understanding the pattern');await page.evaluate(()=>window.modalityFixture.fail=true);await page.getByRole('button',{name:'Regenerate client summary',exact:true}).click();await expect(page.getByText('The clinical draft could not be validated. Your existing work is unchanged.',{exact:true}).first()).toBeVisible();await expect(page.locator('.tiptap')).toContainText('Understanding the pattern');
  const failedNotice=page.getByTestId('summary-evidence-limit');await expect(failedNotice.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  assert.ok(await failedNotice.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'passage failure notice fits viewport');
  await failedNotice.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/passage-recovery-'+viewport.width+'.png',fullPage:true});
  await page.evaluate(()=>{window.modalityFixture.fail=false;window.modalityFixture.tooLarge=true});
  await failedNotice.getByRole('button',{name:'Try again',exact:true}).click();
  const notice=page.getByTestId('summary-evidence-limit');await expect(notice).toBeVisible();
  const before=await page.evaluate(()=>window.modalityFixture.calls.length);
  await notice.getByRole('button',{name:'Adjust evidence',exact:true}).click();
  const evidenceSelect=page.locator('select').filter({has:page.locator('option[value="last_five"]')});await expect(evidenceSelect).toBeFocused();
  assert.equal(await page.evaluate(()=>window.modalityFixture.calls.length),before);await expect(page.locator('.tiptap')).toContainText('Understanding the pattern');
  assert.ok(await notice.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'recovery notice fits viewport');
  await notice.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/evidence-recovery-'+viewport.width+'.png',fullPage:true});
  await evidenceSelect.selectOption('current');await expect(notice).toHaveCount(0);assert.equal(await page.evaluate(()=>window.modalityFixture.calls.length),before);
  assert.deepEqual(await page.evaluate(()=>window.modalityFixture.writes),[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({viewport,recentSessions:3,realPipeline:'PASS',provider:'controlled synthetic transport',zoomOptIn:'PASS',privateBoundary:'PASS',clientPreservation:'PASS',responsiveLayout:'PASS',unexpectedWrites:0,browserErrors:0}));await context.close();
 }
}finally{clearTimeout(deadline);await browser?.close();await server?.close();}
