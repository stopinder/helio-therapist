<template>
  <section class="rounded-panel border border-border-muted bg-surface-elevated p-inline-lg">
    <header class="mb-stack-md flex items-center justify-between gap-inline-md pt-stack-md">
      <div>
        <h3 class="text-h3 font-semibold text-ink">{{ lens.sections.current_focus?.label || 'Aims and objectives' }}</h3>
        <p class="mt-1 text-caption text-ink-muted">{{ lens.sections.current_focus?.emptyState || 'What the client is hoping to work towards.' }}</p>
      </div>
      <button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="$emit('open-care')">View {{ lens.terminology.care }}</button>
    </header>
    <p v-if="loading" class="pb-stack-md text-body-sm text-ink-muted">Loading {{ lens.terminology.care }}…</p>
    <div v-else-if="focusItems.length" class="divide-y divide-border pb-stack-sm">
      <p v-for="item in focusItems.slice(0,3)" :key="item.id" class="py-stack-sm text-body-sm leading-relaxed text-ink-secondary">{{ item.body }}</p>
    </div>
    <p v-else class="pb-stack-md text-body-sm text-ink-muted">{{ lens.sections.current_focus?.emptyState || 'No aims or objectives recorded yet.' }}</p>
    <div class="border-t border-border py-stack-md">
      <button v-if="!editing" type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="editing=true">+ Add aim or objective</button>
      <div v-else class="space-y-stack-sm">
        <label :for="`current-focus-${clientId}`" class="text-caption font-medium text-ink-secondary">Aim or objective</label>
        <textarea :id="`current-focus-${clientId}`" v-model="draft" rows="2" class="w-full rounded-control border border-border bg-surface px-inline-md py-stack-sm text-body-sm text-ink" placeholder="What is the client hoping to work towards?"></textarea>
        <div class="flex justify-end gap-inline-sm">
          <button type="button" class="button-secondary" @click="cancel">Cancel</button>
          <button type="button" class="button-primary" :disabled="saving||!draft.trim()" @click="save">{{ saving?'Saving…':'Save aim or objective' }}</button>
        </div>
        <p v-if="saveError" class="text-body-sm text-state-danger">{{ saveError }}</p>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed,onMounted,ref } from 'vue';import { createClientCareItem,listClientCareItems } from '../../lib/clientCare.js';import { getLens,DEFAULT_LENS_ID } from '../../lib/clinicalLenses.js';
const props=defineProps({clientId:{type:String,required:true},refreshKey:{type:Number,default:0},lensId:{type:String,default:DEFAULT_LENS_ID}});defineEmits(['open-care']);const items=ref([]),loading=ref(true),editing=ref(false),draft=ref(''),saving=ref(false),saveError=ref('');const lens=computed(()=>getLens(props.lensId));const focusItems=computed(()=>items.value.filter(item=>item.kind==='current_focus'&&item.status==='current'));
async function load(){loading.value=true;try{items.value=await listClientCareItems(props.clientId)}catch(e){items.value=[]}finally{loading.value=false}}function cancel(){editing.value=false;draft.value='';saveError.value=''}async function save(){if(!draft.value.trim())return;saving.value=true;saveError.value='';try{const saved=await createClientCareItem({clientId:props.clientId,kind:'current_focus',body:draft.value.trim(),origin:'clinician'});items.value.unshift(saved);cancel()}catch(e){saveError.value='Aim or objective could not be saved.'}finally{saving.value=false}}onMounted(load)
</script>
