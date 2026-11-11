<template>
  <details v-if="traceable.length" class="rounded-panel border border-border-muted bg-surface-elevated p-4" data-testid="summary-evidence-trace">
    <summary class="cursor-pointer text-body-sm font-semibold text-ink">Review supporting passages <span class="font-normal text-ink-muted">· Therapist reference</span></summary>
    <p class="text-caption text-ink-muted mt-3">These passages support your review. A quotation match does not establish clinical correctness. This reference panel is not included in the client’s PDF.</p>
    <div v-for="(claim,index) in traceable" :key="index" class="mt-4 border-t border-border-muted pt-3">
      <p class="text-body-sm text-ink">{{ claim.text }}</p>
      <p v-if="claim.secondaryOnly" class="mt-1 text-caption text-ink-muted">Supported by secondary AI material only. Check against the original encounter.</p>
      <p v-if="claim.evidenceStrength === 'tentative_connection'" class="mt-1 text-caption text-ink-muted">Tentative interpretation, not an established fact.</p>
      <div v-for="(citation,c) in claim.citations" :key="c" class="mt-2"><p class="text-caption text-ink-muted">{{ sourceLabel(citation) }}</p><blockquote class="border-l-2 border-border pl-3 mt-2 text-body-sm text-ink-secondary whitespace-pre-wrap break-words">{{ citation.quote }}</blockquote></div>
    </div>
  </details>
</template>
<script setup>
import {computed} from 'vue';
const props=defineProps({claims:{type:Array,default:()=>[]}});
const sourceLabel=citation=>({transcript:'Original transcript',zoom_summary:'Zoom AI summary',reviewed_session_capture:'Reviewed capture',prior_session_summary:'Earlier summary',therapist_context:'Therapist context',accepted_care:'Accepted Therapy Focus'}[citation.sourceType]||'Source passage')+(citation.occurredAt?' · '+new Date(citation.occurredAt).toLocaleDateString('en-GB'): '');
const traceable=computed(()=>props.claims.filter(claim=>claim.citations?.length));
</script>
<style scoped>
summary:focus-visible {outline:2px solid var(--accent);outline-offset:4px;}
blockquote {max-width:75ch;line-height:1.7;}
</style>
