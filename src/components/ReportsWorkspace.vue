<template>
  <section class="reports-workspace">
    <header><div><h1>Reports</h1><p>Create and manage therapist-approved documents.</p></div><div class="header-actions"><button class="secondary" @click="showUpload = true">Upload report</button><button class="primary" @click="showSetup = true">Create report</button></div></header>
    <div class="toolbar">
      <label class="search"><span>⌕</span><input v-model="query" type="search" placeholder="Search by client, report or reference" /></label>
      <div class="filters"><button v-for="item in filters" :key="item.id" :class="{active:filter===item.id}" @click="filter=item.id">{{ item.label }} <span>{{ count(item.id) }}</span></button></div>
    </div>
    <div v-if="filteredReports.length" class="report-list">
      <div class="list-head"><span>Client</span><span>Report</span><span>Period</span><span>Status</span><span></span></div>
      <button v-for="report in filteredReports" :key="report.id" class="report-row" @click="openReport(report)"><span>{{ report.clientName }}</span><span>{{ report.type }}</span><span>{{ report.period }}</span><span><b :class="`status ${report.status}`">{{ statusLabel(report.status) }}</b></span><span>Open ›</span></button>
    </div>
    <div v-else class="empty-state"><div>📄</div><h2>{{ query ? 'No matching reports' : 'No reports yet' }}</h2><p>Reports will appear here after they have been securely created and saved.</p><button v-if="!query" class="secondary" @click="showSetup=true">Set up a report</button></div>

    <div v-if="showSetup" class="modal-backdrop" @click.self="closeSetup">
      <article class="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <header><div><p class="eyebrow">New report</p><h2 id="setup-title">Choose the report sources</h2></div><button class="close" @click="closeSetup">×</button></header>
        <div class="form-grid">
          <label>Client<select v-model="setup.clientId"><option value="">Select a client</option><option v-for="client in activeClients" :key="client.id" :value="client.id">{{ client.name }}</option></select></label>
          <label>Report type<select v-model="setup.type"><option value="progress">Progress summary</option><option value="session">Session summary</option><option value="ending">Discharge / ending summary</option><option value="custom">Custom report</option></select></label>
          <label>From<input v-model="setup.dateFrom" type="date" /></label><label>To<input v-model="setup.dateTo" type="date" /></label>
        </div>
        <section class="source-boundary"><strong>What will happen next</strong><ol><li>Select relevant sessions and accepted findings.</li><li>Optionally ask AI for a traceable first draft.</li><li>Edit and approve every section.</li><li>Save the completed report to the client’s Documents tab.</li></ol></section>
        <div v-if="setupReady" class="secure-notice"><strong>Report setup ready</strong><p>The secure reports data model must be connected before clinical content can be drafted or saved. This setup has not stored any clinical information.</p></div>
        <footer><button class="secondary" @click="closeSetup">Cancel</button><button class="primary" :disabled="!canContinue" @click="setupReady=true">Continue safely</button></footer>
      </article>
    </div>

    <div v-if="showUpload" class="modal-backdrop" @click.self="closeUpload">
      <article class="setup-modal" role="dialog" aria-modal="true"><header><div><p class="eyebrow">Upload report</p><h2>Add a completed document</h2></div><button class="close" @click="closeUpload">×</button></header>
        <div class="form-grid"><label>Client<select v-model="upload.clientId"><option value="">Select a client</option><option v-for="client in activeClients" :key="client.id" :value="client.id">{{ client.name }}</option></select></label><label>Report type<select v-model="upload.type"><option value="progress">Progress summary</option><option value="session">Session summary</option><option value="ending">Discharge / ending summary</option><option value="custom">Custom report</option></select></label><label>Report title<input v-model="upload.title" type="text" /></label><label>Report date<input v-model="upload.reportDate" type="date" /></label><label class="file-field">PDF or Word document<input ref="fileInput" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="selectFile" /><small>Maximum 10 MB. Stored privately.</small></label></div>
        <p v-if="uploadError" class="upload-error">{{ uploadError }}</p><footer><button class="secondary" @click="closeUpload">Cancel</button><button class="primary" :disabled="!canUpload||uploading" @click="uploadReport">{{ uploading?'Uploading…':'Upload securely' }}</button></footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
const props=defineProps({clients:{type:Array,default:()=>[]}})
const filters=[{id:'draft',label:'Drafts'},{id:'review',label:'Ready for review'},{id:'completed',label:'Completed'},{id:'all',label:'All'}]
const reports=ref([]),filter=ref('all'),query=ref(''),showSetup=ref(false),setupReady=ref(false),showUpload=ref(false),uploading=ref(false),uploadError=ref(''),selectedFile=ref(null),fileInput=ref(null)
const setup=reactive({clientId:'',type:'progress',dateFrom:'',dateTo:''})
const upload=reactive({clientId:'',type:'progress',title:'',reportDate:''})
const activeClients=computed(()=>props.clients.filter(client=>!client.archived).sort((a,b)=>a.name.localeCompare(b.name)))
const filteredReports=computed(()=>{const term=query.value.toLowerCase().trim();return reports.value.filter(r=>filter.value==='all'||r.status===filter.value).filter(r=>!term||`${r.clientName} ${r.type} ${r.reference||''}`.toLowerCase().includes(term))})
const canContinue=computed(()=>setup.clientId&&setup.type&&setup.dateFrom&&setup.dateTo&&setup.dateFrom<=setup.dateTo)
const canUpload=computed(()=>upload.clientId&&upload.type&&upload.title.trim()&&upload.reportDate&&selectedFile.value)
function count(value){return value==='all'?reports.value.length:reports.value.filter(report=>report.status===value).length}
function statusLabel(value){return {draft:'Draft',review:'Ready for review',completed:'Completed'}[value]||value}
function closeSetup(){showSetup.value=false;setupReady.value=false}
function closeUpload(){showUpload.value=false;uploadError.value='';selectedFile.value=null;if(fileInput.value)fileInput.value.value=''}
function selectFile(event){selectedFile.value=event.target.files?.[0]||null}
async function loadReports(){try{const response=await authenticatedFetch('/api/documents');const data=await response.json();if(!response.ok)throw new Error(data.error);reports.value=(data.documents||[]).map(d=>({id:d.id,clientName:d.client_name,type:d.title,period:d.report_date||'—',status:d.status,reference:d.original_filename}))}catch(error){console.error(error)}}
async function openReport(report){const response=await authenticatedFetch(`/api/documents?download=${encodeURIComponent(report.id)}`);const data=await response.json();if(response.ok&&data.url)window.open(data.url,'_blank','noopener')}
async function uploadReport(){uploading.value=true;uploadError.value='';try{const client=activeClients.value.find(c=>String(c.id)===String(upload.clientId));const params=new URLSearchParams({clientRef:String(upload.clientId),clientName:client.name,title:upload.title,documentType:upload.type,reportDate:upload.reportDate});const response=await authenticatedFetch(`/api/documents?${params}`,{method:'POST',headers:{'Content-Type':selectedFile.value.type,'X-File-Name':encodeURIComponent(selectedFile.value.name)},body:selectedFile.value});const data=await response.json();if(!response.ok)throw new Error(data.error||'Upload failed');closeUpload();await loadReports()}catch(error){uploadError.value=error.message}finally{uploading.value=false}}
onMounted(loadReports)
</script>

<style scoped>
.reports-workspace{max-width:68rem;margin:0 auto;color:var(--text-primary)}.reports-workspace>header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.4rem}.header-actions{display:flex;gap:.5rem}.reports-workspace h1{font-size:1.65rem;margin:0}.reports-workspace header p{color:var(--text-muted);margin:.25rem 0}.primary,.secondary{padding:.65rem .95rem;border-radius:.55rem;font-weight:600}.primary{border:1px solid var(--action-link);background:var(--action-link);color:var(--text-on-action)}.primary:disabled{opacity:.45}.secondary{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.toolbar{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.8rem;padding:.8rem;margin-bottom:.8rem}.search{display:flex;gap:.6rem;align-items:center;border:1px solid var(--border);border-radius:.55rem;padding:0 .7rem}.search input{width:100%;border:0;outline:0;padding:.7rem 0}.filters{display:flex;gap:.25rem;margin-top:.7rem;overflow:auto}.filters button{border:0;background:transparent;color:var(--text-muted);padding:.5rem .7rem;border-radius:.45rem;white-space:nowrap}.filters button.active{background:var(--state-selected);color:var(--action-link-hover);font-weight:600}.filters span{font-size:.7rem}.report-list{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.8rem;overflow:hidden}.list-head,.report-row{display:grid;grid-template-columns:1.1fr 1.4fr 1fr 1fr auto;gap:1rem;padding:.75rem 1rem;align-items:center}.list-head{background:var(--surface-muted);color:var(--text-muted);font-size:.75rem;font-weight:700}.report-row{width:100%;border:0;border-top:1px solid var(--border-muted);background:var(--surface-elevated);text-align:left}.status{padding:.25rem .45rem;border-radius:999px;font-size:.7rem}.empty-state{min-height:24rem;background:var(--surface-elevated);border:2px dashed var(--border-muted);border-radius:.9rem;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:var(--text-muted);padding:2rem}.empty-state div{font-size:2.2rem}.empty-state h2{color:var(--text-secondary);margin:.6rem 0 .2rem}.empty-state p{margin:.2rem 0 1rem}.modal-backdrop{position:fixed;inset:0;z-index:80;background:var(--surface-backdrop);display:flex;align-items:center;justify-content:center;padding:1rem}.setup-modal{width:min(42rem,100%);max-height:92vh;overflow:auto;background:var(--surface-elevated);border-radius:1rem;padding:1.3rem}.setup-modal>header{display:flex;justify-content:space-between}.eyebrow{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);font-weight:700}.setup-modal h2{margin:.2rem 0 1rem}.close{border:0;background:transparent;font-size:1.7rem;color:var(--text-muted)}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.form-grid label{display:flex;flex-direction:column;gap:.35rem;font-size:.8rem;font-weight:600}.form-grid select,.form-grid input{border:1px solid var(--border);border-radius:.5rem;padding:.65rem;background:var(--surface-elevated)}.file-field{grid-column:1/-1}.file-field small{color:var(--text-muted);font-weight:400}.upload-error{color:var(--state-danger);background:var(--state-danger-surface);padding:.6rem;border-radius:.5rem}.source-boundary,.secure-notice{border:1px solid var(--border-muted);border-radius:.65rem;background:var(--surface-muted);padding:.8rem;margin-top:1rem}.source-boundary ol{margin:.5rem 0 0;padding-left:1.25rem;color:var(--text-muted);font-size:.8rem;line-height:1.7}.secure-notice{border-color:var(--state-selected);background:var(--state-selected);color:var(--text-primary)}.secure-notice p{margin:.25rem 0;font-size:.8rem}.setup-modal footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}@media(max-width:700px){.reports-workspace>header{align-items:flex-start;flex-direction:column}.header-actions{width:100%}.header-actions button{flex:1}.filters button{flex:1}.form-grid{grid-template-columns:1fr}.modal-backdrop{padding:0;align-items:flex-end}.setup-modal{border-radius:1rem 1rem 0 0}.list-head{display:none}.report-row{grid-template-columns:1fr auto}.report-row span:nth-child(3),.report-row span:nth-child(4){display:none}}
</style>
