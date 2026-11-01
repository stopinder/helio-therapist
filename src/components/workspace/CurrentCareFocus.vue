<template>
  <section class="rounded-panel border border-border-muted bg-surface-elevated px-inline-lg py-stack-lg" data-testid="therapy-focus-summary">
    <header class="flex flex-wrap items-start justify-between gap-inline-md">
      <div>
        <p class="type-overline text-action-link">Therapy</p>
        <h2 class="mt-1 text-h2 font-semibold text-ink">Therapy Focus</h2>
        <p class="mt-1 max-w-2xl text-body-sm text-ink-muted">The current working view of what matters in the therapy, without opening the full record.</p>
      </div>
      <button type="button" class="button-secondary shrink-0" @click="$emit('open-focus')">Open full Therapy Focus</button>
    </header>

    <div v-if="editingLegacyNote" class="mt-stack-md rounded-control border border-border-muted bg-surface-subtle p-inline-md py-stack-md">
      <label :for="`therapy-focus-note-${client.id}`" class="text-caption font-semibold text-ink-secondary">Working note</label>
      <textarea
        :id="`therapy-focus-note-${client.id}`"
        v-model="legacyDraft"
        rows="3"
        class="mt-2 w-full rounded-control border border-border bg-surface px-inline-md py-stack-sm text-body-sm text-ink"
        placeholder="What is most important to keep in view right now?"
      ></textarea>
      <div class="mt-stack-sm flex justify-end gap-inline-sm">
        <button type="button" class="button-secondary" :disabled="savingLegacyNote" @click="cancelLegacyEdit">Cancel</button>
        <button type="button" class="button-primary" :disabled="savingLegacyNote" @click="saveLegacyNote">{{ savingLegacyNote ? 'Saving…' : 'Save' }}</button>
      </div>
      <p v-if="legacyError" class="mt-stack-sm text-body-sm text-state-danger">{{ legacyError }}</p>
    </div>

    <div v-else-if="client.note" class="mt-stack-md rounded-control border border-border-muted bg-surface-subtle px-inline-md py-stack-md">
      <div class="flex items-start justify-between gap-inline-md">
        <p class="whitespace-pre-wrap text-body-sm font-medium leading-relaxed text-ink">{{ client.note }}</p>
        <button type="button" class="shrink-0 text-caption font-medium text-action-link hover:underline" @click="startLegacyEdit">Edit</button>
      </div>
    </div>

    <p v-if="loading" class="mt-stack-md text-body-sm text-ink-muted">Loading Therapy Focus…</p>

    <div v-else-if="currentItems.length" class="mt-stack-md divide-y divide-border-muted border-y border-border-muted">
      <article v-for="item in currentItems.slice(0, 4)" :key="item.id" class="py-stack-sm">
        <p class="text-caption font-semibold text-ink-muted">{{ sectionTitle(item.kind) }}</p>
        <p class="mt-1 text-body-sm leading-relaxed text-ink-secondary">{{ item.body }}</p>
      </article>
    </div>

    <div v-else-if="!client.note" class="mt-stack-md rounded-control border border-dashed border-border px-inline-md py-stack-md">
      <p class="text-body-sm font-medium text-ink-secondary">No Therapy Focus has been established yet.</p>
      <p class="mt-1 text-caption text-ink-muted">Add an aim manually, or open the full Therapy Focus to review the clinical history with Helios.</p>
    </div>

    <footer class="mt-stack-md flex flex-wrap items-center gap-inline-md">
      <button v-if="!addingAim" type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="addingAim=true">+ Add aim or objective</button>
      <span v-if="currentItems.length > 4" class="text-caption text-ink-muted">+ {{ currentItems.length - 4 }} more in full Therapy Focus</span>
    </footer>

    <div v-if="addingAim" class="mt-stack-md rounded-control border border-border-muted bg-surface-subtle p-inline-md py-stack-md">
      <label :for="`therapy-aim-${client.id}`" class="text-caption font-semibold text-ink-secondary">Aim or objective</label>
      <textarea :id="`therapy-aim-${client.id}`" v-model="aimDraft" rows="2" class="mt-2 w-full rounded-control border border-border bg-surface px-inline-md py-stack-sm text-body-sm text-ink" placeholder="What is the client hoping to work towards?"></textarea>
      <div class="mt-stack-sm flex justify-end gap-inline-sm">
        <button type="button" class="button-secondary" @click="cancelAim">Cancel</button>
        <button type="button" class="button-primary" :disabled="savingAim || !aimDraft.trim()" @click="saveAim">{{ savingAim ? 'Saving…' : 'Save aim or objective' }}</button>
      </div>
      <p v-if="aimError" class="mt-stack-sm text-body-sm text-state-danger">{{ aimError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createClientCareItem, listClientCareItems } from '../../lib/clientCare.js'
import { updateClientFocus } from '../../lib/clients.js'
import { getLens, DEFAULT_LENS_ID } from '../../lib/clinicalLenses.js'

const props=defineProps({
  client:{type:Object,required:true},
  refreshKey:{type:Number,default:0},
  lensId:{type:String,default:DEFAULT_LENS_ID}
})
const emit=defineEmits(['open-focus','client-updated','changed'])
const items=ref([])
const loading=ref(true)
const addingAim=ref(false)
const aimDraft=ref('')
const savingAim=ref(false)
const aimError=ref('')
const editingLegacyNote=ref(false)
const legacyDraft=ref(props.client?.note || '')
const savingLegacyNote=ref(false)
const legacyError=ref('')

const lens=computed(()=>getLens(props.lensId))
const currentItems=computed(()=>items.value.filter(item=>item.status==='current'))
function sectionTitle(kind){return lens.value.sections[kind]?.label || 'Therapy Focus'}

async function load(){
  loading.value=true
  try{items.value=await listClientCareItems(props.client.id)}
  catch{items.value=[]}
  finally{loading.value=false}
}
function cancelAim(){addingAim.value=false;aimDraft.value='';aimError.value=''}
async function saveAim(){
  if(!aimDraft.value.trim())return
  savingAim.value=true
  aimError.value=''
  try{
    const saved=await createClientCareItem({clientId:props.client.id,kind:'current_focus',body:aimDraft.value.trim(),origin:'clinician'})
    items.value.unshift(saved)
    cancelAim()
    emit('changed',items.value)
  }catch{
    aimError.value='Aim or objective could not be saved.'
  }finally{
    savingAim.value=false
  }
}
function startLegacyEdit(){
  legacyDraft.value=props.client.note || ''
  legacyError.value=''
  editingLegacyNote.value=true
}
function cancelLegacyEdit(){
  legacyDraft.value=props.client.note || ''
  legacyError.value=''
  editingLegacyNote.value=false
}
async function saveLegacyNote(){
  if(savingLegacyNote.value)return
  savingLegacyNote.value=true
  legacyError.value=''
  try{
    const updated=await updateClientFocus({clientId:props.client.id,note:legacyDraft.value})
    emit('client-updated',updated)
    editingLegacyNote.value=false
  }catch(error){
    legacyError.value=error?.message || 'This Therapy Focus note could not be saved.'
  }finally{
    savingLegacyNote.value=false
  }
}

watch(()=>props.refreshKey,load)
watch(()=>props.client.id,load)
watch(()=>props.client.note,value=>{if(!editingLegacyNote.value)legacyDraft.value=value||''})
onMounted(load)
</script>
