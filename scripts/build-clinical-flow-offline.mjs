// Bundle the real Vue screens with synthetic service adapters. Never used in production.
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const codeByFile={
  'api.js': {authenticatedFetch:`async (url,options={})=>{const state=window.flowFixture;let row=window.flowRow;if(!row){row=window.flowRow={id:'source-a',clientId:state.assigned?'client-a':null,sessionRef:state.assigned?'encounter-exact':null,status:state.assigned?'ready':'unassigned',source:'zoom_my_notes',sourceTitle:'Synthetic session source',sourceOccurredAt:'2026-10-30T09:00:00Z',receivedAt:'2026-10-30T10:00:00Z',updatedAt:'2026-10-30T10:00:00Z',sourceReview:state.review,zoomGeneratedSummary:'Key Outcomes\\nImported Zoom note: we explored several relationships and inner positions.',text:null}}const parsed=new URL(url,'https://fixture.test');const method=options.method||'GET';const body=options.body?JSON.parse(options.body):null;await window.recordFlowRequest({method,query:parsed.search,body});if(method==='PATCH'){row=window.flowRow={...row,clientId:'client-a',sessionRef:'encounter-exact',status:'ready',updatedAt:'2026-10-30T11:00:00Z'};return{ok:true,json:async()=>({transcript:row})}}if(parsed.searchParams.has('clientId')&&!parsed.searchParams.has('sessionRef'))return{ok:false,json:async()=>({error:'Choose both client and encounter.'})};return{ok:true,json:async()=>parsed.searchParams.has('id')?{transcript:{...row,text:'Therapist: What did you notice?\\nClient: I felt curious about both positions.'}}:{transcripts:[row]}}}`},
  'supabase.js': {supabase:'null'},
  'clients.js':{listClients:`async()=>[{id:'client-a',name:'SHAL (synthetic)'}]`,getClient:`async()=>({id:'client-a',name:'SHAL (synthetic)',preferred_summary_lens:'integrative'})`,updateClientSummaryPreference:`async ({lens})=>{window.preferenceWrites=(window.preferenceWrites||[]).concat(lens);return{preferred_summary_lens:lens}}`},
  'sessions.js':{getSession:`async(params)=>{window.requestedEncounter=params;return{id:'encounter-exact',clientId:'client-a',status:'source_ready',startedAt:'2026-10-30T09:00:00Z'}}`,listSessions:`async()=>[{id:'encounter-exact',clientId:'client-a',status:'source_ready',startedAt:'2026-10-30T09:00:00Z'}]`},
  'clientDocuments.js':{findSessionSummary:`async()=>window.flowFixture.existing?{id:'doc-1',status:window.flowFixture.finalised?'completed':'draft',content:{body:'Existing reviewed draft, preserved unchanged.',summaryGeneration:{lens:'integrative',window:'current'}}}:null`,checkSummarySourceSafety:`async()=>({safe:true})`,generateSessionSummary:`async(input)=>{window.generatedInputs=(window.generatedInputs||[]).concat(input);throw new Error('No AI used in navigation tests')}`}
};
const mocks={name:'synthetic-flow-services',enforce:'pre',transform(code,id){
  for(const [file,overrides]of Object.entries(codeByFile))if(id===`${root}/src/lib/${file}`){
    const names=[...new Set([...code.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+(\w+)/g)].map(m=>m[1]))];
    return names.map(name=>`export const ${name}=${overrides[name]||`()=>{throw new Error('Unexpected fixture operation: ${file}:${name}')}`};`).join('\n');
  }
  // External fonts are irrelevant to flow assertions and unavailable offline.
  if(id.endsWith('/src/main.css'))return code.replace(/^@import url.*$/gm,'');
}};
await build({root,configFile:false,define:{'process.env.NODE_ENV':JSON.stringify('production')},plugins:[mocks,vue()],build:{outDir:process.env.FLOW_OFFLINE_DIR||'/tmp/helios-clinical-flow',emptyOutDir:true,lib:{entry:root+'/e2e/fixtures/clinical-workspace-flow.js',name:'ClinicalFlow',formats:['iife'],fileName:()=> 'flow.iife.js',cssFileName:'flow'}}});
