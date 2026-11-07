<template>
  <div class="session-summary-document surface-panel !border-none !bg-surface-raised/50 shadow-sm" :class="compact ? 'p-4' : 'p-6 sm:p-12'">
    <div class="max-w-[65ch] mx-auto">
      <header v-if="!compact" class="mb-8 border-b border-border-muted pb-6">
        <h1 class="font-serif text-h1 text-ink mb-2">Session Summary</h1>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-ink-muted">
          <div v-if="clientName" class="flex items-center gap-1.5"><User class="workspace-icon-sm" /><span>{{ clientName }}</span></div>
          <div v-if="date" class="flex items-center gap-1.5"><Calendar class="workspace-icon-sm" /><span>{{ date }}</span></div>
        </div>
      </header>
      <div class="document-body space-y-5 text-body-long text-ink-secondary leading-relaxed">
        <template v-for="(block,index) in parsedBlocks" :key="index">
          <h2 v-if="block.type==='heading'" class="font-serif text-h2 text-ink pt-4 first:pt-0">{{ block.content }}</h2>
          <p v-else class="whitespace-pre-wrap break-words"><template v-for="(piece,pieceIndex) in block.pieces" :key="pieceIndex"><a v-if="piece.href" :href="piece.href" target="_blank" rel="noopener noreferrer" class="text-action-link underline">{{ piece.text }}</a><template v-else>{{ piece.text }}</template></template></p>
        </template>
      </div>
      <div v-if="!parsedBlocks.length" class="py-12 text-center text-ink-subtle italic">No content available for this summary.</div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { User, Calendar } from '@lucide/vue';
import { parseSummaryBlocks } from '../../lib/summaryAuthoring.js';
const props=defineProps({body:{type:String,default:''},clientName:{type:String,default:''},date:{type:String,default:''},compact:Boolean});
const parsedBlocks=computed(()=>parseSummaryBlocks(props.body));
</script>
<style scoped>
.document-body { font-size: 1.05rem; line-height: 1.75; }
@media (prefers-reduced-motion: no-preference) {
  .session-summary-document { animation: fadeUp var(--motion-standard) var(--motion-ease); }
}
</style>
