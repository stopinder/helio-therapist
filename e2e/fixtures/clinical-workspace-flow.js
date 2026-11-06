// Synthetic, browser-only integration harness; never imported by the application.
import { createApp, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView, useRoute } from 'vue-router';
import TranscriptInbox from '../../src/components/TranscriptInbox.vue';
import ClientTranscriptsPanel from '../../src/components/workspace/ClientTranscriptsPanel.vue';
import SessionWorkspace from '../../src/views/SessionWorkspace.vue';
import '../../src/main.css';
const clients = [{ id: 'client-a', name: 'SHAL (synthetic)' }];
const Inbox = { setup() { const route = useRoute(); return () => h(TranscriptInbox, { clients, openTranscriptId: route.query.transcript || null }); } };
const Client = { setup() { const route = useRoute(); return () => h(ClientTranscriptsPanel, { clientId: route.params.clientId }); } };
const router = createRouter({history:createMemoryHistory(), routes:[
  {name:'Transcripts',path:'/transcripts',component:Inbox},
  {name:'ClientWorkspace',path:'/clients/:clientId',component:Client},
  {name:'SessionWorkspace',path:'/clients/:clientId/sessions/:sessionId',component:SessionWorkspace},
  {path:'/help',component:{render:()=>h('div')}}
]});
async function boot() {
  const entry=window.flowFixture?.entry;
  await router.push(entry==='client'?'/clients/client-a':entry==='detail'?'/transcripts?transcript=source-a':'/transcripts');
  await router.isReady();
  window.flowRouter=router;
  createApp({render:()=>h('main',{class:'min-h-screen'},[h(RouterView)])}).use(router).mount('#app');
}
boot();
