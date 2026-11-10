<template>
  <section class="intelligence-controls" data-testid="clinical-intelligence-controls" aria-label="Clinical intelligence preparation">
    <div class="intelligence-orientation">
      <span class="icon-surface icon-surface-accent intelligence-icon" aria-hidden="true"><Compass class="workspace-icon" /></span>
      <div class="min-w-0">
        <p class="type-overline text-action-link">{{ profile.label }} pathway <span class="preview-label">Preview</span></p>
        <p class="mt-1 text-body-sm text-ink-secondary intelligence-description">{{ profile.description }}</p>
      </div>
    </div>
    <fieldset class="mt-4" :disabled="disabled">
      <legend class="text-caption font-semibold text-ink mb-2">Prepare for</legend>
      <div class="output-choices">
        <label class="output-choice" :class="{ 'output-choice-selected': mode === 'client_summary' }">
          <input type="radio" :name="radioName" value="client_summary" :checked="mode === 'client_summary'" @change="emit('update:mode','client_summary')" />
          <div><span class="text-body-sm font-semibold text-ink">Client summary</span><span class="block mt-1 text-caption text-ink-secondary">An editable account of the work, written for the client.</span></div>
        </label>
        <label class="output-choice" :class="{ 'output-choice-selected': mode === 'therapist_formulation' }">
          <input type="radio" :name="radioName" value="therapist_formulation" :checked="mode === 'therapist_formulation'" @change="emit('update:mode','therapist_formulation')" />
          <div><span class="text-body-sm font-semibold text-ink">Therapist formulation</span><span class="block mt-1 text-caption text-ink-secondary">A separate working view. Never inserted into the client document.</span></div>
        </label>
      </div>
    </fieldset>
    <details class="zoom-reference mt-4" data-testid="summary-zoom-preview" @toggle="onToggle">
      <summary class="zoom-disclosure"><span class="inline-flex items-center gap-2"><FileText class="workspace-icon-sm" aria-hidden="true" /><span>Zoom summary</span></span><span class="text-caption text-ink-muted">{{ includeZoomSummary ? 'Included as secondary context' : 'Reference only' }}</span></summary>
      <div class="pt-3 space-y-3">
        <p class="text-caption text-ink-muted">Zoom’s AI-generated interpretation is available when useful. The original transcript and therapist-reviewed material take priority; this is not independent corroboration.</p>
        <p v-if="loading" role="status" class="text-body-sm text-ink-secondary">Loading the selected Zoom notes…</p>
        <div v-else-if="loadError" role="alert" class="text-body-sm text-state-danger"><p>{{ loadError }}</p><button type="button" class="text-action-link underline mt-2" @click="loadSources">Try again</button></div>
        <p v-else-if="loaded && !notes.length" class="text-body-sm text-ink-muted">No Zoom summary is saved for the selected sessions. You can still use the other available material.</p>
        <div v-for="note in notes" :key="note.id" class="zoom-note">
          <p class="text-caption font-semibold text-ink mb-2">{{ dateLabel(note.occurredAt) }} <span class="font-normal text-ink-muted">· Secondary AI source</span></p>
          <p v-if="note.needsReview" class="text-caption text-state-warning mb-2">This source needs therapist review before generation.</p>
          <div class="zoom-note-text text-body-sm text-ink-secondary whitespace-pre-wrap break-words" tabindex="0" aria-label="Zoom generated summary">{{ note.text }}</div>
        </div>
        <label v-if="notes.length" class="flex items-start gap-2 text-body-sm text-ink-secondary">
          <input type="checkbox" class="mt-1" :checked="includeZoomSummary" :disabled="disabled || notes.some(note => note.needsReview)" @change="emit('update:includeZoomSummary',$event.target.checked)" />
          <span>Include these Zoom notes as secondary context<span class="block text-caption text-ink-muted mt-1">Leaving this off excludes their text from the new generation; the saved notes are unchanged.</span></span>
        </label>
      </div>
    </details>
    <p class="intelligence-process text-caption text-ink-muted mt-3">Source evidence <span aria-hidden="true">→</span> {{ profile.label }} formulation <template v-if="mode === 'client_summary'"><span aria-hidden="true">→</span> Client writing</template></p>
  </section>
</template>
<script setup>
import { computed, ref, watch, useId } from 'vue';
import { Compass, FileText } from '@lucide/vue';
import { getSummaryModality } from '../../lib/summaryModalities.js';
import { readModalitySources } from '../../lib/modalityIntelligence.js';
const props = defineProps({lens:{type:String,default:'integrative'},mode:{type:String,default:'client_summary'},includeZoomSummary:Boolean,selection:{type:Object,required:true},disabled:Boolean});
const emit = defineEmits(['update:mode','update:includeZoomSummary']);
const radioName = 'intelligence-output-' + useId();
const profile = computed(()=>getSummaryModality(props.lens));
const notes=ref([]),loading=ref(false),loaded=ref(false),loadError=ref(''),opened=ref(false);
let requestVersion=0;
watch(()=>JSON.stringify(props.selection),()=>{requestVersion++;notes.value=[];loaded.value=false;loading.value=false;loadError.value='';emit('update:includeZoomSummary',false);if(opened.value)void loadSources();});
function dateLabel(value){return value?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Selected session';}
function onToggle(event){opened.value=event.target.open;if(opened.value&&!loaded.value&&!loading.value)void loadSources();}
async function loadSources(){
  const version=++requestVersion;loading.value=true;loadError.value='';
  try{const result=await readModalitySources(props.selection);if(version!==requestVersion)return;notes.value=result.zoomSummaries||[];loaded.value=true;}
  catch(error){if(version===requestVersion)loadError.value=error.message||'The Zoom notes could not be loaded.';}
  finally{if(version===requestVersion)loading.value=false;}
}
</script>
<style scoped>
.intelligence-controls { border-top: 1px solid var(--border-muted); padding-top: 1rem; }
.intelligence-orientation { display: flex; gap: .75rem; align-items: flex-start; }
.intelligence-icon { flex-shrink: 0; }
.intelligence-description { max-width: 65ch; line-height: 1.6; }
.preview-label { display: inline-block; margin-left: .5rem; padding: .1rem .4rem; border: 1px solid var(--border-muted); border-radius: var(--radius-control); font-size: .65rem; letter-spacing: .04em; color: var(--text-muted); }
.output-choices { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .65rem; }
.output-choice { display: flex; align-items: flex-start; gap: .65rem; padding: .85rem 1rem; border: 1px solid var(--border-muted); border-radius: var(--radius-control); background: var(--surface); cursor: pointer; }
.output-choice input { margin-top: .2rem; accent-color: var(--accent); flex-shrink: 0; }
.output-choice-selected { border-color: var(--accent); background: var(--state-selected); }
.output-choice:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.zoom-reference { border: 1px solid var(--border-muted); border-radius: var(--radius-control); padding: .8rem 1rem; background: var(--surface); }
.zoom-disclosure { cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .875rem; font-weight: 600; color: var(--text-primary); }
.zoom-disclosure:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
.zoom-note { border-top: 1px solid var(--border-muted); padding-top: .75rem; }
.zoom-note-text { max-height: 18rem; overflow-y: auto; padding-right: .5rem; line-height: 1.7; }
.intelligence-process { display: flex; flex-wrap: wrap; gap: .5rem; }
@media (max-width: 540px) { .output-choices { grid-template-columns: 1fr; } .zoom-disclosure { align-items: flex-start; flex-direction: column; gap: .25rem; } }
</style>
