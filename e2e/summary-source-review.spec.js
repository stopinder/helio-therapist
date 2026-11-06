import { test, expect } from '@playwright/test';
const transcriptId='cccccccc-cccc-4ccc-8ccc-cccccccccccc',sourceVersion='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const text='Therapist: Welcome Alex.\nAlex: I worry about work.\nTherapist: Goodbye Alex.\nTherapist: Welcome Casey.\nCasey: I am grieving my father.\nTherapist: We will continue next week.';
async function fixture(page,{conflict=false}={}){
 const posts=[];
 await page.route('**/src/lib/api.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const authenticatedFetch=(url,options)=>fetch(url,options);'}));
 await page.route('**/src/lib/clients.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const listClients=async()=>[{id:"c1",name:"Alex Example"},{id:"c2",name:"Casey Example"}];'}));
 await page.route('**/api/zoom/source-review*',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{data:{transcriptId,sourceVersion,state:'needs_review',clientId:'c1',sessionId:'s1',text,zoomNote:'A secondary note referring to two conversations.',occurredAt:'2026-11-04T09:00:00Z',message:'Check this source against the original conversation.',evidence:[{sourceType:'zoom_note',quote:'A secondary note referring to two conversations.'}]}}});
  const body=route.request().postDataJSON();posts.push(body);
  if(conflict)return route.fulfill({status:409,json:{error:{code:'SOURCE_CHANGED',message:'The source changed. Reload before confirming.'}}});
  return route.fulfill({json:{data:{id:transcriptId,sourceVersion:'new-version',review:{state:body.action==='split'?'separated':'confirmed'},segments:body.action==='split'?[{id:'t-a',clientId:'c1',sessionId:'s-a'},{id:'t-b',clientId:'c2',sessionId:'s-b'}]:[]}}});
 });
 await page.goto('/e2e/fixtures/source-review-harness.html');await expect(page.getByLabel('Original transcript with line numbers')).toBeVisible();return posts;
}
for(const viewport of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
 test(`review and confirm on ${viewport.name}`,async({page})=>{
  await page.setViewportSize(viewport);const posts=await fixture(page);await expect(page.getByRole('button',{name:'Confirm this encounter'})).toBeDisabled();
  await page.getByPlaceholder('Explain who is speaking').fill('One individual discussing several family relationships, not separate appointments.');
  await page.getByLabel('I have reviewed the original source').check();await page.getByRole('button',{name:'Confirm this encounter'}).click();await expect(page.locator('#result')).toHaveText('confirm');expect(posts).toHaveLength(1);expect(posts[0].sourceVersion).toBe(sourceVersion);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/source-review-${viewport.name}.png`,fullPage:true});
 });
}
test('split reviewed conversations with exact client boundaries and destinations',async({page})=>{
 const posts=await fixture(page);await page.getByLabel('Separate conversations').check();
 await page.getByLabel('First line',{exact:true}).nth(0).fill('1');await page.getByLabel('Last line',{exact:true}).nth(0).fill('3');await page.getByLabel('First line',{exact:true}).nth(1).fill('4');await page.getByLabel('Last line',{exact:true}).nth(1).fill('6');
 await page.getByRole('combobox').nth(0).selectOption('c1');await page.getByRole('combobox').nth(1).selectOption('c2');for(const box of await page.getByLabel('I reviewed these boundaries').all())await box.check();
 await page.getByRole('button',{name:'Create separate reviewed encounters'}).click();await expect(page.getByTestId('reviewed-segments')).toBeVisible();expect(posts[0].segments.map(s=>[s.startLine,s.endLine,s.clientId])).toEqual([[1,3,'c1'],[4,6,'c2']]);expect(posts[0]).not.toHaveProperty('text');
 await expect(page.getByRole('link',{name:'Open summary for Alex Example'})).toHaveAttribute('href',/clients\/c1\/sessions\/s-a/);await expect(page.getByRole('link',{name:'Open summary for Casey Example'})).toHaveAttribute('href',/clients\/c2\/sessions\/s-b/);
});
test('stale source cannot be silently confirmed',async({page})=>{
 const posts=await fixture(page,{conflict:true});await page.getByPlaceholder('Explain who is speaking').fill('One client discussing several relationships.');await page.getByLabel('I have reviewed the original source').check();await page.getByRole('button',{name:'Confirm this encounter'}).click();await expect(page.getByRole('alert')).toContainText('source changed');await expect(page.locator('#result')).toHaveCount(0);expect(posts).toHaveLength(1);
});
