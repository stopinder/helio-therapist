<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <div class="flex items-center justify-between mb-8">
        <h3 class="text-h3 font-semibold text-ink">Professional Development</h3>
        <div v-if="loading" class="flex items-center gap-2 text-body-sm text-ink-muted">
          <span class="w-4 h-4 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          Checking Pack status...
        </div>
        <div v-else class="flex flex-col items-end gap-2">
          <button 
            @click="toggleSupervisionPack"
            :disabled="updating || !reflection"
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
          <p v-if="!reflection && !loading" class="text-xs text-ink-muted">Complete Reflection to enable Pack action</p>
        </div>
      </div>

      <div class="space-y-8">
        <div v-for="section in placeholderSections" :key="section.title" class="p-6 border border-border rounded-panel bg-surface-subtle">
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-3">{{ section.title }}</h4>
          <p class="text-body-sm text-ink-muted italic leading-relaxed">
            {{ section.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
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

const reflection = ref(null);
const loading = ref(true);
const updating = ref(false);
const error = ref('');

const placeholderSections = [
  { 
    title: 'Supervision Questions', 
    description: 'Key therapist-owned professional development areas identified for clinical supervision will appear here.' 
  },
  { 
    title: 'Anonymised Case Themes', 
    description: 'Core therapist-owned professional development areas extracted from session content and therapist reflection.' 
  },
  { 
    title: 'Therapist Reflection Summary', 
    description: 'A curated summary of the therapist\'s internal experience and therapist-owned professional development areas.' 
  },
  { 
    title: 'Ethical Considerations', 
    description: 'Identification of any ethical or boundary therapist-owned professional development areas requiring supervision input.' 
  },
  { 
    title: 'Action Points', 
    description: 'Planned follow-up actions and therapist-owned professional development areas.' 
  }
];

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
