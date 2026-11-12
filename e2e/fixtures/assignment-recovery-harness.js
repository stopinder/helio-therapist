import { createApp, h, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import TranscriptAssignmentDialog from '../../src/components/workspace/TranscriptAssignmentDialog.vue';
import '../../src/main.css';
const empty={render:()=>h('p')};
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:empty},{name:'SessionWorkspace',path:'/clients/:clientId/sessions/:sessionId',component:empty},{path:'/clients/:clientId',component:empty}]});
createApp({setup(){const open=ref(true);return()=>h('main',{class:'p-6'},[h('button',{onClick:()=>{open.value=true}},'Change assignment'),open.value?h(TranscriptAssignmentDialog,{transcriptId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clients:[{id:'old',name:'Original client'},{id:'new',name:'Correct client'}],onClose:()=>{open.value=false}}):null])}}).use(router).mount('#app');
