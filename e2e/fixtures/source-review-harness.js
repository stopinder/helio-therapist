import { createApp, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import SourceReviewPanel from '../../src/components/workspace/SourceReviewPanel.vue';
import '../../src/main.css';
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{template:'<p></p>'}},{name:'SessionWorkspace',path:'/clients/:clientId/sessions/:sessionId',component:{template:'<p>Reviewed encounter destination</p>'}}]});
createApp({components:{SourceReviewPanel},setup(){return{result:ref(null)}},template:'<main class="max-w-4xl mx-auto p-4"><SourceReviewPanel transcript-id="cccccccc-cccc-4ccc-8ccc-cccccccccccc" @resolved="result=$event" /><p v-if="result" id="result" role="status">{{result.action}}</p></main>'}).use(router).mount('#app');
