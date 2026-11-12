import {test,expect} from '@playwright/test';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function fixture(page,{blocked=false,failure=false}={}){
 const posts=[];
 await page.route('**/src/lib/api.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const authenticatedFetch=(url,options)=>fetch(url,options);'}));
 await page.route('**/src/lib/clients.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const listClients=async()=>[];'}));
 await page.route('**/src/lib/sessions.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const listSessions=async()=>[];'}));
 let state={id,clientId:'old',sessionId:'session',sourceVersion:'initial',updatedAt:'initial',occurredAt:'2026-11-11T10:00:00Z',text:'Therapist: Welcome.\nClient: This transcript belongs to another client.',zoomNote:'An imported session overview for identity checking.',affected:blocked?[{kind:'document',label:'Approved clinical record',status:'final',count:1}]:[],blocked};
 await page.route('**/api/zoom/transcript-assignment*',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{data:state}});
  const body=route.request().postDataJSON();posts.push(body);
  if(failure)return route.fulfill({status:409,json:{error:{message:'This transcript changed. Nothing was moved or deleted.'}}});
  state={...state,sourceVersion:'saved',updatedAt:'saved',clientId:body.action==='reassign'?'new':body.action==='undo'?'old':null,sessionId:body.action==='reassign'?'new-session':body.action==='undo'?'session':null};
  return route.fulfill({json:{data:{...state,action:body.action,canUndo:!['detach_delete','undo','flag'].includes(body.action),eventId:'event',deleted:body.action==='detach_delete'}}});
 });
 await page.goto('/e2e/fixtures/assignment-recovery-harness.html');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('Assigned to', {exact:false})).toContainText('Original client');return posts;
}
for(const viewport of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
 test(`all four correction choices fit ${viewport.name} and detachment survives reopen`,async({page})=>{
  await page.setViewportSize(viewport);const posts=await fixture(page);await expect(page.getByRole('radio')).toHaveCount(4);
  await page.screenshot({path:`test-results/assignment-${viewport.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('radio',{name:/Detach and archive/}).check();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Detach and archive',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Detached and archived');expect(posts[0].action).toBe('detach_archive');
  await page.getByRole('button',{name:'Undo correction'}).click();await expect(page.getByRole('status')).toContainText('previous assignment is restored');expect(posts[1].action).toBe('undo');
  await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Change assignment',exact:true}).click();await expect(page.getByText('Assigned to', {exact:false})).toContainText('Original client');
 });
}
test('reassigns only after the correct client and explicit attestation are selected',async({page})=>{
 const posts=await fixture(page);await expect(page.getByRole('button',{name:'Assign to another client',exact:true})).toBeDisabled();await page.getByLabel('Correct client').selectOption('new');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Assign to another client',exact:true}).click();await expect(page.getByRole('status')).toContainText('Assigned to Correct client');expect(posts[0].targetClientId).toBe('new');await expect(page.getByRole('link',{name:'Open corrected encounter'})).toHaveAttribute('href',/clients\/new\/sessions\/new-session/);
});
test('deletes only after explicit permanent deletion acknowledgement',async({page})=>{
 const posts=await fixture(page);await page.getByRole('radio',{name:/Detach and delete/}).check();await expect(page.getByText('It cannot be undone.',{exact:false})).toBeVisible();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Detach and delete',exact:true}).click();await expect(page.getByRole('status')).toContainText('Detached and deleted');await expect(page.getByRole('button',{name:'Undo correction'})).toHaveCount(0);expect(posts[0].action).toBe('detach_delete');
});
test('lists protected work and offers an explicit source pause instead of moving records',async({page})=>{
 const posts=await fixture(page,{blocked:true});await expect(page.getByTestId('assignment-affected-work')).toContainText('Approved clinical record');await expect(page.getByRole('radio')).toHaveCount(0);await page.getByRole('button',{name:'Mark assignment incorrect and pause source use'}).click();await expect(page.getByRole('status')).toContainText('Related work needs review');expect(posts[0].action).toBe('flag');
});
test('a failed save stays visible and offers reload without claiming success',async({page})=>{
 await fixture(page,{failure:true});await page.getByRole('radio',{name:/Detach and return to Inbox/}).check();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Detach and return to Inbox',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Nothing was moved or deleted');await expect(page.getByTestId('assignment-correction-result')).toHaveCount(0);await expect(page.getByRole('button',{name:'Reload current assignment'})).toBeVisible();
});
