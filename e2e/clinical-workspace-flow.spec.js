import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const clientId='client-a',sessionRef='encounter-exact',sourceId='source-a';
async function fixture(page,{entry='inbox',assigned=false,existing=true,finalised=false,review=null,navigationFailure=false}={}) {
  const requests=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('recordFlowRequest',item=>requests.push(item));
  const dir=process.env.FLOW_OFFLINE_DIR||'/tmp/helios-clinical-flow';
  await page.setContent('<style>'+fs.readFileSync(path.join(dir,'flow.css'),'utf8')+'</style><div id="app"></div>');
  await page.evaluate(options=>{
    window.flowFixture=options;
    // about:blank has no secure-context randomUUID; use random bytes in this harness only.
    if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  },{entry,assigned,existing,finalised,review});
  await page.addScriptTag({path:path.join(dir,'flow.iife.js')});
  await expect(page.locator(entry==='client'?'[data-testid="client-transcripts-panel"]':'.transcript-inbox')).toBeVisible();
  if(navigationFailure)await page.evaluate(()=>{window.rejectNext=true;window.flowRouter.beforeEach(to=>{if(to.name==='SessionWorkspace'&&window.rejectNext){window.rejectNext=false;return false}})});
  return {requests,errors};
}
async function assertWorkspace(page,requests,{existing=true}={}) {
  await expect(page.getByRole('heading',{name:'Prepare session summary'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Summary approach',exact:true})).toBeVisible();
  const route=await page.evaluate(()=>({params:window.flowRouter.currentRoute.value.params,query:window.flowRouter.currentRoute.value.query}));
  expect(route.params).toEqual({clientId,sessionId:sessionRef});
  expect(route.query).toMatchObject({view:'summary',prepare:'1',transcriptId:sourceId});
  expect(requests.some(item=>item.query===`?id=${sourceId}`)).toBe(true);
  if(existing)await expect(page.getByText('Existing reviewed draft, preserved unchanged.')).toBeVisible();
  expect(await page.evaluate(()=>window.generatedInputs||[])).toEqual([]);
  await page.getByRole('combobox',{name:'Summary approach',exact:true}).selectOption('internal_family_systems');
  expect(await page.evaluate(()=>window.generatedInputs||[])).toEqual([]);
}
for(const width of [1280,390])test(`assign opens exact clinical workspace with IFS visible at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const {requests,errors}=await fixture(page);
  await page.getByLabel('Client',{exact:true}).first().selectOption(clientId);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Assign & open Clinical Workspace',exact:true}).click();
  await assertWorkspace(page,requests);expect(requests.filter(item=>item.method==='PATCH')).toHaveLength(1);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/clinical-workspace-${width}.png`,fullPage:true});
});
test('stay in inbox retains a direct continuation button',async({page})=>{
  const {requests,errors}=await fixture(page);await page.getByLabel('Client',{exact:true}).first().selectOption(clientId);await page.getByRole('button',{name:'Assign & stay in inbox',exact:true}).click();
  await expect(page.getByTestId('assignment-handoff')).toContainText('SHAL (synthetic)');await page.getByTestId('assignment-handoff').getByRole('button',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);expect(errors).toEqual([]);
});
test('client transcript panel opens exact source and keeps lens options visible',async({page})=>{
  const {requests,errors}=await fixture(page,{entry:'client',assigned:true});await page.getByRole('link',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);await expect(page.getByRole('link',{name:'Back to client transcripts'})).toBeVisible();expect(requests.filter(item=>item.method==='PATCH')).toHaveLength(0);expect(errors).toEqual([]);
});
test('full transcript has the same primary workspace route',async({page})=>{
  const {requests,errors}=await fixture(page,{entry:'detail',assigned:true});await page.getByRole('button',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);expect(errors).toEqual([]);
});
test('navigation retry does not submit a second assignment',async({page})=>{
  const {requests}=await fixture(page,{navigationFailure:true});await page.getByLabel('Client',{exact:true}).first().selectOption(clientId);await page.getByRole('button',{name:'Assign & open Clinical Workspace',exact:true}).click();await expect(page.getByRole('alert')).toContainText('assignment is saved');await page.getByTestId('assignment-handoff').getByRole('button',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);expect(requests.filter(item=>item.method==='PATCH')).toHaveLength(1);
});
test('finalised summary is read-only rather than inviting regeneration',async({page})=>{
  await fixture(page,{entry:'client',assigned:true,finalised:true});await page.getByRole('link',{name:'Open Clinical Workspace',exact:true}).click();await expect(page.getByText('This summary is finalised and read-only.',{exact:false})).toBeVisible();await expect(page.getByRole('combobox',{name:'Summary approach',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>window.generatedInputs||[])).toEqual([]);
});
test('client-level source concern offers review instead of a dead workspace button',async({page})=>{
  const {requests}=await fixture(page,{entry:'client',assigned:true,review:{state:'needs_review'}});await expect(page.getByRole('link',{name:'Review source',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Open Clinical Workspace',exact:true})).toHaveCount(0);expect(requests.filter(item=>item.method==='PATCH')).toHaveLength(0);
});
test('fresh source opens lens preparation without generating anything',async({page})=>{
  const {requests,errors}=await fixture(page,{entry:'client',assigned:true,existing:false});await page.getByRole('link',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests,{existing:false});await expect(page.getByRole('button',{name:'Generate summary',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('client transcript reader fetches the original on demand',async({page})=>{
  const {requests,errors}=await fixture(page,{entry:'client',assigned:true});await page.getByRole('button',{name:'View transcript',exact:true}).click();await expect(page.getByText('Client: I felt curious about both positions.',{exact:false})).toBeVisible();expect(requests.some(item=>item.query===`?id=${sourceId}`)).toBe(true);expect(errors).toEqual([]);
});
test('assigned History card has the primary clinical workspace action',async({page})=>{
  const {requests}=await fixture(page,{assigned:true});await page.getByRole('button',{name:'History',exact:true}).click();await page.getByRole('button',{name:'Open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);
});
test('assignment from the full reader reaches the same encounter and IFS controls',async({page})=>{
  const {requests,errors}=await fixture(page,{entry:'detail'});await page.getByLabel('Client',{exact:true}).first().selectOption(clientId);await page.getByRole('button',{name:'Assign & open Clinical Workspace',exact:true}).click();await assertWorkspace(page,requests);expect(requests.filter(item=>item.method==='PATCH')).toHaveLength(1);expect(errors).toEqual([]);
});
