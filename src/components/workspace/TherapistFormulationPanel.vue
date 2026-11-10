<template>
  <section class="rounded-panel border border-border bg-surface-elevated p-5 sm:p-7 space-y-5" data-testid="therapist-formulation" aria-label="Therapist-only working formulation">
    <header class="flex items-start gap-3 border-b border-border-muted pb-4">
      <LockKeyhole class="workspace-icon text-action-link shrink-0 mt-1" aria-hidden="true" />
      <div><p class="type-overline text-action-link">Therapist working view</p><h3 class="font-serif text-h2 text-ink mt-1">{{ profile.label }} formulation</h3><p class="text-body-sm text-ink-secondary mt-2 max-w-[65ch]">Provisional and unsaved. Review its evidence and alternatives. This is not an approved Clinical Record and will not be added to the client summary or PDF.</p></div>
    </header>
    <p v-for="warning in formulation.sourceWarnings || []" :key="warning" class="text-body-sm text-ink-muted">{{ warning }}</p>
    <div class="space-y-5 max-w-[75ch]">
      <section v-for="field in populatedFields" :key="field.key" class="formulation-field">
        <h4 class="text-body font-semibold text-ink">{{ field.label }}</h4>
        <div v-for="(item,index) in field.items" :key="index" class="mt-3">
          <p class="text-body-sm text-ink-secondary leading-relaxed"><span class="formulation-status" :class="item.status === 'hypothesis' ? 'text-action-link' : 'text-ink-muted'">{{ statusLabel(item.status) }}</span>{{ item.text }}</p>
          <details v-if="item.evidenceIds.length" class="mt-2 ml-1">
            <summary class="text-caption text-action-link cursor-pointer">Supporting passages</summary>
            <div v-for="observation in observationsFor(item.evidenceIds)" :key="observation.id" class="mt-3 border-l-2 border-border-muted pl-3 space-y-2">
              <p class="text-caption text-ink-muted">{{ observation.secondaryOnly ? 'Secondary AI interpretation — not independent evidence' : 'Source-linked observation' }}</p>
              <blockquote v-for="(citation,i) in observation.citations" :key="i" class="text-body-sm text-ink-secondary whitespace-pre-wrap">{{ citation.quote }}</blockquote>
            </div>
          </details>
        </div>
      </section>
    </div>
    <div v-if="formulation.limitations?.length" class="rounded-control bg-surface-subtle border border-border-muted p-4"><h4 class="text-body-sm font-semibold text-ink">What remains uncertain</h4><p v-for="item in formulation.limitations" :key="item" class="mt-2 text-body-sm text-ink-secondary">{{ item }}</p></div>
    <footer class="border-t border-border-muted pt-4 space-y-3">
      <label class="flex items-start gap-2 text-body-sm text-ink-secondary"><input v-model="reviewed" type="checkbox" class="mt-1" /><span>I have reviewed this working formulation and its supporting material.</span></label>
      <div class="flex flex-wrap items-center gap-3"><button type="button" class="button-secondary" :disabled="!reviewed" @click="copyFormulation">Copy therapist formulation</button><span v-if="copyMessage" role="status" class="text-caption text-ink-muted">{{ copyMessage }}</span></div>
    </footer>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue';
import { LockKeyhole } from '@lucide/vue';
import { getSummaryModality } from '../../lib/summaryModalities.js';
const props=defineProps({formulation:{type:Object,required:true}});
const reviewed=ref(false),copyMessage=ref('');
const profile=computed(()=>getSummaryModality(props.formulation.modalityId));
const populatedFields=computed(()=>Object.entries(profile.value.formulation).map(([key,label])=>({key,label,items:props.formulation.fields[key]||[]})).filter(field=>field.items.length));
watch(()=>props.formulation,()=>{reviewed.value=false;copyMessage.value='';});
const statusLabel=status=>({supported:'Source-linked · ',hypothesis:'Working hypothesis · ',unknown:'Not established · '})[status]||'';
function observationsFor(ids){return (props.formulation.evidence||[]).filter(item=>ids.includes(item.id));}
async function copyFormulation(){
  if(!reviewed.value)return;
  const text=['Therapist-only working formulation — not an approved Clinical Record',profile.value.label,...populatedFields.value.map(field=>`${field.label}\n${field.items.map(item=>statusLabel(item.status)+item.text).join('\n\n')}`),...(props.formulation.limitations?.length?['What remains uncertain',...props.formulation.limitations]:[]),...(props.formulation.sourceWarnings||[])].join('\n\n');
  try{await navigator.clipboard.writeText(text);copyMessage.value='Copied as therapist-only working material.';}catch{copyMessage.value='Copy was unavailable. The working view is unchanged.';}
}
</script>
<style scoped>
.formulation-status { font-size: .75rem; font-weight: 600; }
.formulation-field + .formulation-field { padding-top: 1rem; border-top: 1px solid var(--border-muted); }
summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
</style>
