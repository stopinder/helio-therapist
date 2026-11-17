// Local synthetic UI fixture. No real client records, external APIs or writes.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { chromium, expect } from '@playwright/test';
const root=fileURLToPath(new URL('..',import.meta.url));
const entry='\0virtual:focus-entry',care='\0virtual:focus-care',dictation='\0virtual:focus-dictation',api='\0virtual:focus-api';
const plugin={name:'focus-entry-fixture',enforce:'pre',resolveId(source,importer){
 if(source==='virtual:focus-entry')return entry;
 if(importer?.endsWith('/ClientCarePanel.vue')&&source.endsWith('/lib/clientCare.js'))return care;
 if(source.endsWith('/composables/useWhisperDictation.js'))return dictation;
 if(importer?.endsWith('/useAskHelios.js')&&source.endsWith('/lib/api.js'))return api;
},load(id){
 if(id===api)return 'export async function authenticatedFetch(){return {ok:true,json:async()=>({success:true,clients:[],conversations:[]})}}';
 if(id===dictation)return `import {ref} from 'vue';export const appendDictation=(a,b)=>a+b;export function useWhisperDictation(){return {busy:ref(false),recording:ref(false),transcribing:ref(false),error:ref(''),toggle(){},resetError(){}}}`;
 if(id===care)return `export async function listClientCareItems(){return []} export async function generateCareSuggestions(input){window.focusRequest=input;if(window.failFocus)throw new Error('The review was incomplete. Nothing has been saved.');return {suggestions:[],sources:Array.from({length:9},(_,i)=>({id:'session:'+i,occurredAt:'2026-10-'+String(i+1).padStart(2,'0'),sourceType:'transcript_backed_session_summary',reviewStatus:'draft'})),coverage:{selectedSessions:9,totalSessions:9}}} export async function saveReviewedCareItem(){throw new Error('Unexpected save')} export async function updateClientCareItem(){throw new Error('Unexpected update')}`;
 if(id===entry)return `import {createApp,h} from 'vue';import Care from '/src/components/workspace/ClientCarePanel.vue';import Header from '/src/components/shell/AppHeader.vue';import AskPanel from '/src/components/ui/AskHeliosPanel.vue';import {useAskHelios} from '/src/composables/useAskHelios.js';import '/src/main.css';
const ask=useAskHelios();const current={clientId:'11111111-1111-4111-8111-111111111111',clientName:'Fictional couple',anchorSessionId:'22222222-2222-4222-8222-222222222222',lens:'clinical',window:'last_three',source:'client_workspace'};ask.registerWorkspaceContext(()=>current);window.openOther=()=>ask.openClinicalContext({...current,clientId:'33333333-3333-4333-8333-333333333333',clientName:'Other fictional client'});
createApp({render:()=>h('div',[h(Header,{pageName:'Client workspace',routePath:'/clients/'+current.clientId,now:new Date(),currentTimeLabel:'11:00',appointmentStatus:'neutral'}),h('main',{style:'max-width:1100px;margin:auto;padding:16px'},[h(Care,{clientId:current.clientId,initialLensId:'clinical'})]),h(AskPanel)])}).mount('#fixture');`;
},configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url!=='/__focus-entry')return next();
 try{const html=await server.transformIndexHtml('/__focus-entry','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div><script type="module" src="/@id/__x00__virtual:focus-entry"></script></body></html>');res.setHeader('Content-Type','text/html');res.end(html)}catch(e){next(e)}
})}};
let server,browser;const deadline=setTimeout(()=>{console.error('Focus entry browser check exceeded 90 seconds');process.exit(1)},90000);
try{
 server=await createServer({root,configFile:false,envFile:false,logLevel:'error',plugins:[plugin,vue()],server:{host:'127.0.0.1',port:0,hmr:false},optimizeDeps:{include:['vue','@lucide/vue']}});await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch();
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/__focus-entry');await expect(page.locator('#lens-selector')).toHaveValue('clinical');
  await page.getByRole('button',{name:'Ask Helios',exact:true}).click();await expect(page.locator('#ask-helios-panel')).toContainText('Fictional couple');await expect(page.locator('#ask-helios-panel')).toContainText('Clinical');
  await page.evaluate(()=>window.openOther());await expect(page.locator('#ask-helios-panel')).toContainText('Other fictional client');await page.getByRole('button',{name:'Ask Helios',exact:true}).click();await expect(page.locator('#ask-helios-panel')).toContainText('Fictional couple');await page.getByRole('button',{name:'Close Ask Helios'}).click();
  await page.getByRole('button',{name:'Build from session history',exact:true}).click();await expect(page.getByRole('heading',{name:'Build an initial Therapy Focus'})).toBeVisible();await page.getByRole('button',{name:'Build Therapy Focus',exact:true}).click();
  await expect(page.getByText(/Therapy Focus is still empty/)).toBeVisible();assert.equal(await page.evaluate(()=>window.focusRequest.reviewGoal),'fill_empty');await expect(page.locator('details summary')).toContainText('9 session sources');assert.equal(await page.locator('details').evaluate(e=>e.open),false);
  await page.evaluate(()=>window.failFocus=true);await page.getByRole('button',{name:'Build Therapy Focus',exact:true}).click();await expect(page.getByText('The review was incomplete. Nothing has been saved.')).toBeVisible();await expect(page.getByText(/Therapy Focus is still empty/)).toHaveCount(0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log(JSON.stringify({width,headerContext:'PASS',alreadyOpenContext:'PASS',initialFocus:'PASS',failedReview:'PASS',collapsedSources:'PASS',overflow:'PASS'}));await context.close();
 }
}finally{clearTimeout(deadline);await browser?.close();await server?.close()}
