import { createApp, ref, h } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import SourceReviewPanel from '../../src/components/workspace/SourceReviewPanel.vue';
import '../../src/main.css';
const empty={render:()=>h('p')};
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:empty},{name:'SessionWorkspace',path:'/clients/:clientId/sessions/:sessionId',component:empty}]});
createApp({setup(){const result=ref(null);return()=>h('main',{class:'max-w-4xl mx-auto p-4'},[h(SourceReviewPanel,{transcriptId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',onResolved:value=>{result.value=value}}),result.value?h('p',{id:'result',role:'status'},result.value.action):null])}}).use(router).mount('#app');
