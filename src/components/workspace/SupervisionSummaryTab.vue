<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h3 class="text-h3 font-semibold text-ink">Professional Development</h3>
          <p class="mt-2 text-body-sm text-ink-muted">Use this session's private reflection as part of your ongoing reflective practice and supervision preparation. This material is separate from the client's Clinical Record.</p>
        </div>
        <div v-if="loading" class="flex items-center gap-2 text-body-sm text-ink-muted">
          <span class="w-4 h-4 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          Checking Pack status...
        </div>
        <div v-else-if="reflection" class="flex flex-col items-end gap-2">
          <button 
            @click="toggleSupervisionPack"
            :disabled="updating"
            class="px-inline-md py-stack-xs border text-body-sm font-medium rounded-control transition-all flex items-center gap-2"
            :class="[
              reflection?.included_in_supervision 
                ? 'bg-state-info/10 border-state-info text-state-info hover:bg-state-info/20' 
                : 'bg-surface border-border text-ink hover:bg-surface-subtle'
            ]"
          >
            <span v-if="updating" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            {{ reflection?.included_in_supervision ? 'Remove from Supervision Pack' : 'Add to Supervision Pack' }}
          </button>
          <p v-if="error" class="text-xs text-state-danger">{{ error }}</p>
        </div>
      </div>

      <div v-if="!loading && !reflection" class="py-12 text-center border border-dashed border-border rounded-panel bg-surface-subtle">
        <h4 class="text-body-md font-semibold text-ink mb-2">Complete your private reflection first</h4>
        <p class="text-body-sm text-ink-muted mb-6">A reflection can then be selected for supervision.</p>
        <button type="button" class="button-primary" @click="$emit('open-reflection')">Go to Reflection</button>
      </div>

      <div v-else-if="!loading" class="space-y-8">
        <div class="p-6 border border-border rounded-panel bg-surface-subtle">
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-3">Supervision question</h4>
          <p class="text-body-sm leading-relaxed" :class="reflection.workspace_content?.supervisionQuestions ? 'text-ink' : 'text-ink-muted italic'">
            {{ reflection.workspace_content?.supervisionQuestions || 'No supervision question recorded for this reflection.' }}
          </p>
        </div>

        <div class="flex justify-end pt-4 border-t border-border-muted">
          <RouterLink :to="{ name: 'SupervisionHome' }" class="text-body-sm font-medium text-action-link hover:text-action-link-hover">
            Open Professional Development &rarr;
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { getPrivateReflection, setReflectionSupervisionSelection } from '../../lib/reflections.js';

const props = defineProps({
  clientId: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['open-reflection']);

const reflection = ref(null);
const loading = ref(true);
const updating = ref(false);
const error = ref('');

async function fetchReflection() {
  loading.value = true;
  error.value = '';
  try {
    const data = await getPrivateReflection({
      clientId: props.clientId,
      sessionId: props.sessionId
    });
    reflection.value = data;
  } catch (err) {
    console.error('[SupervisionSummaryTab] Fetch error:', err);
    error.value = 'Failed to load reflection status';
  } finally {
    loading.value = false;
  }
}

async function toggleSupervisionPack() {
  if (!reflection.value || updating.value) return;

  updating.value = true;
  error.value = '';
  
  const newValue = !reflection.value.included_in_supervision;
  
  try {
    const updated = await setReflectionSupervisionSelection({
      reflectionId: reflection.value.id,
      included: newValue
    });
    reflection.value = updated;
  } catch (err) {
    console.error('[SupervisionSummaryTab] Update error:', err);
    error.value = 'Failed to update Supervision Pack status';
  } finally {
    updating.value = false;
  }
}

onMounted(fetchReflection);

watch(() => props.sessionId, fetchReflection);
</script>
