<template>
  <section class="transcript-conversation" aria-label="Readable transcript">
    <div class="reader-tools">
      <label v-if="searchable" class="reader-search">
        <span class="sr-only">Search this transcript</span>
        <input v-model="search" type="search" class="control-field" placeholder="Search this transcript" />
      </label>
      <span class="reader-count" role="status">{{ matchingTurns.length }} passage{{ matchingTurns.length === 1 ? '' : 's' }}{{ activeQuery ? ' found' : '' }}</span>
      <button v-if="showRawControl" type="button" class="reader-action" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide raw source' : 'Raw source' }}</button>
    </div>
    <p v-if="hasUnidentified" class="reader-context">Speaker names were not supplied for some passages. Names and roles have not been inferred.</p>
    <div v-if="visibleTurns.length" class="reader-passages" tabindex="0" aria-label="Transcript passages">
      <article v-for="(turn, index) in visibleTurns" :key="`${turn.key}-${turn.sourceIndex}`" class="reader-passage">
        <header v-if="index === 0 || turn.key !== visibleTurns[index - 1].key || turn.time" class="passage-heading">
          <span v-if="index === 0 || turn.key !== visibleTurns[index - 1].key" :class="{ unidentified: !turn.identified }">{{ turn.speaker }}</span>
          <time v-if="turn.time">{{ turn.time }}</time>
        </header>
        <p>{{ turn.text }}</p>
      </article>
    </div>
    <p v-else class="reader-empty">{{ activeQuery ? 'No transcript passages match your search.' : 'No readable transcript text is available.' }}</p>
    <div v-if="visibleTurns.length < matchingTurns.length" class="reader-more">
      <span>Showing {{ visibleTurns.length }} of {{ matchingTurns.length }} passages.</span>
      <button type="button" class="reader-action" @click="limit += pageSize">Show more passages</button>
    </div>
    <pre v-if="showRaw" class="reader-raw" aria-label="Exact imported source">{{ transcript?.text }}</pre>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { conversationTurns, searchConversationTurns } from '../lib/transcriptPresentation.js'

const props = defineProps({
  transcript: { type: Object, default: null },
  query: { type: String, default: '' },
  searchable: { type: Boolean, default: true },
  showRawControl: { type: Boolean, default: true }
})
const pageSize = 60
const search = ref(''), limit = ref(pageSize), showRaw = ref(false)
const activeQuery = computed(() => props.searchable ? search.value : props.query)
const turns = computed(() => conversationTurns(props.transcript))
const matchingTurns = computed(() => searchConversationTurns(turns.value, activeQuery.value))
const visibleTurns = computed(() => matchingTurns.value.slice(0, limit.value))
const hasUnidentified = computed(() => turns.value.some(turn => !turn.identified))
watch(activeQuery, () => { limit.value = pageSize })
watch(() => props.transcript?.id, () => { search.value = ''; limit.value = pageSize; showRaw.value = false })
</script>

<style scoped>
.transcript-conversation { min-width:0; }
.reader-tools { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem .75rem; margin-bottom:.6rem; }
.reader-search { flex:1 1 12rem; max-width:22rem; }
.reader-search input { min-width:0; width:100%; }
.reader-count,.reader-context,.reader-more { color:var(--text-muted); font-size:var(--type-metadata-size); line-height:1.5; }
.reader-context { margin:0 0 .6rem; }
.reader-action { display:inline-flex; align-items:center; min-height:2.25rem; padding:.35rem .65rem; border:1px solid var(--border-muted); border-radius:var(--radius-control); background:var(--state-selected); color:var(--accent); font-size:var(--type-metadata-size); cursor:pointer; }
.reader-action:hover { border-color:var(--accent); }
.reader-passages { max-height:32rem; overflow:auto; border:1px solid var(--border-muted); border-radius:var(--radius-control); background:var(--surface-elevated); scrollbar-gutter:stable; }
.reader-passage { padding:.7rem .85rem; border-bottom:1px solid var(--border-muted); }
.reader-passage:last-child { border-bottom:0; }
.passage-heading { display:flex; justify-content:space-between; gap:.75rem; margin-bottom:.25rem; color:var(--accent); font-size:var(--type-ui-size); font-weight:600; }
.passage-heading .unidentified { color:var(--text-muted); font-weight:400; }
.passage-heading time { margin-left:auto; color:var(--text-subtle); font-size:var(--type-metadata-size); font-weight:400; font-variant-numeric:tabular-nums; }
.reader-passage p { margin:0; color:var(--text-secondary); font-size:.875rem; line-height:1.65; overflow-wrap:anywhere; white-space:pre-wrap; }
.reader-empty { padding:1rem; color:var(--text-muted); font-size:var(--type-ui-size); }
.reader-more { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; margin-top:.6rem; }
.reader-raw { max-height:32rem; overflow:auto; margin-top:1rem; padding:1rem; white-space:pre-wrap; overflow-wrap:anywhere; background:var(--surface-subtle); color:var(--text-secondary); font-size:.8rem; }
@media (pointer:coarse) { .reader-action { min-height:var(--control-target); } }
</style>
