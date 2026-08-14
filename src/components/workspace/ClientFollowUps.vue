<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
    <div class="flex justify-between items-center mb-stack-md pt-stack-md">
      <h3 class="text-h3 font-semibold text-ink">Follow-ups</h3>
      <button 
        @click="showCapture = true"
        type="button" 
        class="text-caption font-medium text-action-link hover:underline"
      >
        Quick capture
      </button>
    </div>

    <div class="pb-stack-md">
      <div v-if="loading && !followUps.length" class="py-stack-md text-center">
        <p class="text-body-sm text-ink-muted">Loading follow-ups...</p>
      </div>
      
      <div v-else-if="!openFollowUps.length" class="py-stack-md text-center border border-dashed border-border rounded-control">
        <p class="text-body-sm text-ink-muted">No follow-ups recorded.</p>
        <button 
          @click="showCapture = true"
          type="button"
          class="mt-2 text-action-link font-medium hover:underline text-body-sm"
        >
          Quick capture
        </button>
      </div>
      
      <div v-else class="space-y-stack-sm">
        <div 
          v-for="item in openFollowUps" 
          :key="item.id"
          class="group flex gap-inline-sm p-inline-md border border-border rounded-control bg-surface hover:border-border-hover transition-colors"
        >
          <input 
            type="checkbox" 
            :checked="!!item.completedAt"
            @change="toggleComplete(item)"
            class="mt-1 w-4 h-4 rounded border-border text-action-link focus:ring-action-link cursor-pointer"
          />
          <div class="flex-1 min-w-0">
            <p class="text-body-sm text-ink leading-relaxed whitespace-pre-wrap">{{ item.body }}</p>
            <p class="text-caption text-ink-muted mt-1">{{ formatDate(item.createdAt) }}</p>
          </div>
        </div>
      </div>

      <div v-if="completedFollowUps.length > 0" class="mt-stack-md pt-stack-md border-t border-border-muted">
        <button 
          @click="showCompleted = !showCompleted"
          type="button"
          class="text-caption text-ink-muted hover:text-ink flex items-center gap-1"
        >
          {{ showCompleted ? 'Hide' : 'Show' }} {{ completedFollowUps.length }} completed
        </button>
        
        <div v-if="showCompleted" class="mt-stack-sm space-y-stack-sm opacity-60">
          <div 
            v-for="item in completedFollowUps" 
            :key="item.id"
            class="flex gap-inline-sm p-inline-md border border-border rounded-control bg-surface-subtle"
          >
            <input 
              type="checkbox" 
              checked
              @change="toggleComplete(item)"
              class="mt-1 w-4 h-4 rounded border-border text-ink-muted focus:ring-ink-muted cursor-pointer"
            />
            <div class="flex-1 min-w-0">
              <p class="text-body-sm text-ink-secondary leading-relaxed line-through">{{ item.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <QuickCaptureModal 
      v-if="showCapture" 
      :client-id="clientId"
      @close="showCapture = false"
      @saved="onSaved"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { listClientFollowUps, setClientFollowUpCompleted } from '../../lib/clientFollowUps.js';
import QuickCaptureModal from './QuickCaptureModal.vue';

const props = defineProps({
  clientId: { type: String, required: true }
});

const followUps = ref([]);
const loading = ref(true);
const showCapture = ref(false);
const showCompleted = ref(false);

const openFollowUps = computed(() => followUps.value.filter(f => !f.completedAt));
const completedFollowUps = computed(() => followUps.value.filter(f => !!f.completedAt));

async function load() {
  loading.value = true;
  try {
    followUps.value = await listClientFollowUps(props.clientId);
  } catch (e) {
    console.error('Failed to load follow-ups:', e);
  } finally {
    loading.value = false;
  }
}

async function toggleComplete(item) {
  const isCompleted = !!item.completedAt;
  try {
    const updated = await setClientFollowUpCompleted({ 
      id: item.id, 
      completed: !isCompleted 
    });
    followUps.value = followUps.value.map(f => f.id === updated.id ? updated : f);
    // Re-sort if needed, though listClientFollowUps does it on load
    followUps.value.sort((a, b) => {
      if (!a.completedAt && b.completedAt) return -1;
      if (a.completedAt && !b.completedAt) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  } catch (e) {
    console.error('Failed to update follow-up:', e);
  }
}

function onSaved(newFollowUp) {
  followUps.value = [newFollowUp, ...followUps.value];
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
}

onMounted(load);
</script>
