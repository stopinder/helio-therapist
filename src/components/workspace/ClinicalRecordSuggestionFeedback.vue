<template>
  <section class="rounded-control border border-border-muted bg-surface-subtle p-3 space-y-2" data-testid="clinical-record-validation-feedback" aria-label="Suggestion checks">
    <p class="text-body-sm text-ink" role="status">
      <template v-if="supportedCount">{{ supportedCount }} field{{ supportedCount === 1 ? '' : 's' }} {{ supportedCount === 1 ? 'has' : 'have' }} matching source passages.</template>
      <template v-else>No source-backed suggestions are ready to use.</template>
      Your working draft has not been changed.
    </p>
    <p class="text-caption text-ink-muted">A matching quotation confirms its source, not that the proposed clinical interpretation is correct. Review the wording before using it. Blank fields do not mean that a concern or risk is absent.</p>
    <div v-if="withheld.length" class="space-y-3" data-testid="clinical-record-withheld-fields">
      <p class="text-body-sm font-semibold text-ink">These suggestions were withheld; other fields remain available</p>
      <div v-for="item in withheld" :key="item.key" class="border-t border-border-muted pt-2 flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0 flex-1"><p class="text-body-sm font-semibold">{{ item.label }}</p><p class="text-caption text-ink-secondary">{{ item.message }}</p></div>
        <button type="button" class="button-secondary text-caption" :disabled="busy" :aria-label="'Retry '+item.label.toLowerCase()" @click="$emit('retry',item.key)">Retry this field</button>
      </div>
    </div>
    <details v-if="empty.length" class="text-caption text-ink-muted" data-testid="clinical-record-empty-fields">
      <summary class="cursor-pointer text-action-link">Fields without a source-backed suggestion ({{ empty.length }})</summary>
      <p v-for="item in empty" :key="item.key" class="mt-2"><strong>{{ item.label }}:</strong> {{ item.message }}</p>
    </details>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { clinicalRecordFieldLabels } from '../../lib/clinicalRecordSuggestionState.js';
const props=defineProps({result:{type:Object,required:true},busy:Boolean});
defineEmits(['retry']);
const supportedCount=computed(()=>Object.keys(clinicalRecordFieldLabels).filter(key=>props.result.fields?.[key]?.text).length);
const entries=computed(()=>Object.entries(clinicalRecordFieldLabels).map(([key,label])=>({key,label,...props.result.fieldResults?.[key]})));
const withheld=computed(()=>entries.value.filter(item=>item.state==='withheld'));
const empty=computed(()=>entries.value.filter(item=>item.state==='empty'));
</script>
