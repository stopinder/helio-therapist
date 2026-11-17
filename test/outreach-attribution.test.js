import test from 'node:test'
import assert from 'node:assert/strict'
import { createOutreachAttribution, OUTREACH_CAMPAIGN } from '../src/lib/outreachAttribution.js'
import handler, { projectCampaignEvent } from '../api/marketing-events.js'
const visitId='11111111-1111-4111-8111-111111111111'
const good={event:'campaign_landing',campaign:OUTREACH_CAMPAIGN,step:'initial',visitId}
test('campaign data projects an allowlist and discards private fields',()=>{
 const result=projectCampaignEvent({...good,email:'private@example.com',clientId:'private',url:'sensitive',transcript:'private'})
 assert.deepEqual(Object.keys(result.properties).sort(),['is_test','$geoip_disable','$ip','$process_person_profile','utm_campaign','utm_content','utm_medium','utm_source'].sort())
 assert.equal(result.properties.$process_person_profile,false);assert.equal(result.properties.$ip,null)
 for(const override of [{event:'clinical_record'},{campaign:'invented'},{visitId:'email@example.com'},{step:'private'}])assert.equal(projectCampaignEvent({...good,...override}),null)
})
test('only tagged public routes are counted once and signup requests are distinct from confirmed accounts',async()=>{
 const calls=[]
 const tracker=createOutreachAttribution({location:{search:`?utm_source=apollo&utm_medium=email&utm_campaign=${OUTREACH_CAMPAIGN}&utm_content=initial&email=private`},fetch:(...args)=>{calls.push(args);return Promise.resolve()},randomUUID:()=>visitId})
 assert.equal(tracker.route('/clients/private'),false);assert.equal(tracker.route('/'),true);assert.equal(tracker.route('/'),false)
 assert.equal(tracker.route('/get-started'),true);assert.equal(tracker.signupRequest('/sign-in'),false);assert.equal(tracker.signupRequest('/get-started'),true)
 await Promise.resolve();assert.equal(calls.length,3);assert.equal(calls.some(c=>c[1].body.includes('private')),false)
 assert.equal(calls[0][1].referrerPolicy,'no-referrer')
})
test('untagged or malformed acquisition and telemetry failures do not affect the application',async()=>{
 for(const search of ['', '?utm_source=apollo&utm_medium=email&utm_campaign=bad']){
  const tracker=createOutreachAttribution({location:{search},fetch:()=>{throw Error('must not send')},randomUUID:()=>visitId})
  assert.equal(tracker.route('/'),false)
 }
 const tracker=createOutreachAttribution({location:{search:`?utm_source=apollo&utm_medium=email&utm_campaign=${OUTREACH_CAMPAIGN}&utm_content=followup`},fetch:()=>Promise.reject(Error('offline')),randomUUID:()=>visitId})
 assert.equal(tracker.route('/'),true);await new Promise(resolve=>setImmediate(resolve))
})
test('ingestion fails closed without configuration and rejects unknown events',async()=>{
 const res={code:200,setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}}
 await handler({method:'POST',body:{...good,event:'sensitive'}},res);assert.equal(res.code,400)
 const token=process.env.POSTHOG_PROJECT_TOKEN,host=process.env.POSTHOG_CAPTURE_HOST
 delete process.env.POSTHOG_PROJECT_TOKEN;delete process.env.POSTHOG_CAPTURE_HOST
 try{await handler({method:'POST',body:good},res);assert.equal(res.code,503)}finally{if(token)process.env.POSTHOG_PROJECT_TOKEN=token;if(host)process.env.POSTHOG_CAPTURE_HOST=host}
})
