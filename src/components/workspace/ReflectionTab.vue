<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div><h3 class="text-h3 font-semibold text-ink">Therapist Reflection</h3><p class="text-body-sm text-ink-muted mt-2 italic border-l-4 border-state-info pl-4">This reflection is private and separate from the client's clinical record. It is intended for your professional development and supervision preparation.</p></div>
        <span class="text-caption text-ink-muted shrink-0">{{ saveStatus }}</span>
      </div>
      <div v-if="loading" class="text-body-sm text-ink-muted">Loading reflection…</div>
      <div v-else class="grid grid-cols-1 gap-8">
        <div v-for="(label, key) in reflectionFields" :key="key" class="space-y-2">
          <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider">{{ label }}</label>
          <textarea :id="key" v-model="reflection[key]" rows="3" class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink" :placeholder="`Reflect on ${label.toLowerCase()}...`" @input="queueSave"></textarea>
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-state-danger">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { decodeSessionReflection, emptySessionReflection, getPrivateReflection, upsertPrivateReflection } from '../../lib/reflections.js';
const props=defineProps({clientId:{type:String,required:true},sessionId:{type:String,required:true}});
const reflectionFields={stoodOut:'What stood out in this session?',emotionalResponse:'Therapist emotional response',countertransference:'Possible countertransference',uncertainties:'Uncertainties or sticking points',supervisionQuestions:'Supervision questions',nextSession:'Next session considerations'};
const reflection=reactive(emptySessionReflection());const loading=ref(true),saving=ref(false),saved=ref(false),error=ref('');let timer;
const saveStatus=computed(()=>saving.value?'Saving…':saved.value?'Saved':'Private reflection');
async function load(){clearTimeout(timer);loading.value=true;error.value='';try{const row=await getPrivateReflection({clientId:props.clientId,sessionId:props.sessionId});Object.assign(reflection,decodeSessionReflection(row?.body||''));if(row?.supervision_question&&!reflection.supervisionQuestions)reflection.supervisionQuestions=row.supervision_question;}catch(e){console.error('[ReflectionTab] Load error:',e);error.value='Could not load your private reflection.';}finally{loading.value=false;}}
function queueSave(){saved.value=false;clearTimeout(timer);timer=setTimeout(save,700);}
async function save(){if(loading.value||saving.value)return;saving.value=true;error.value='';try{await upsertPrivateReflection({clientId:props.clientId,sessionId:props.sessionId,reflection:{...reflection}});saved.value=true;}catch(e){console.error('[ReflectionTab] Save error:',e);error.value='Could not save your private reflection. Please try again.';}finally{saving.value=false;}}
onMounted(load);watch(()=>props.sessionId,load);onBeforeUnmount(()=>clearTimeout(timer));
</script>
