<template>
  <div class="h-full bg-surface-canvas overflow-hidden relative">
    <!-- Background Shapes -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-0 right-0 w-[40%] h-[40%] bg-surface-muted/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 left-0 w-[35%] h-[35%] bg-surface-muted/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
    </div>

    <!-- Hub-and-Spoke Header (only for child pages) -->
    <header v-if="isChildPage" class="h-16 flex items-center px-6 md:px-10 border-b border-border-muted bg-surface/80 backdrop-blur-md z-20 shrink-0 sticky top-0">
      <router-link 
        to="/supervision" 
        class="flex items-center gap-2 text-ink-secondary hover:text-ink transition-colors group focus-visible:ring-2 focus-visible:ring-state-selected rounded-control px-2 py-1 -ml-2"
        aria-label="Back to Professional Development"
      >
        <span class="text-xl transition-transform group-hover:-translate-x-1">←</span>
        <span class="text-body-sm font-medium">Professional Development</span>
      </router-link>
    </header>

    <!-- View Content -->
    <main class="h-full overflow-auto z-10 relative">
      <router-view v-slot="{ Component }">
        <transition name="fade-up" mode="out-in" appear>
          <component 
            :is="Component" 
            v-bind="childProps"
            @toggle-supervision="handleToggleSupervision"
            @open-reflection="handleOpenReflection"
            @open-ai-reflection="handleOpenAIReflection"
            @go-to-session="handleGoToSession"
          />
        </transition>
      </router-view>
    </main>

    <!-- Modals (Shared across sub-views) -->
    <PrivateReflectionModal
      v-if="selectedReflection"
      :reflection="selectedReflection"
      :loading="actionLoading === selectedReflection.id"
      :initial-ai-mode="initialAIMode"
      @close="closeReflectionModal"
      @toggle-supervision="handleToggleSupervision"
      @go-to-session="handleGoToSession"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAllPrivateReflections, setReflectionSupervisionSelection } from '../lib/reflections.js';
import PrivateReflectionModal from '../components/professional-development/PrivateReflectionModal.vue';

const route = useRoute();
const router = useRouter();

const reflections = ref([]);
const loading = ref(true);
const actionLoading = ref(null);
const selectedReflection = ref(null);
const initialAIMode = ref(false);

const isChildPage = computed(() => route.path !== '/supervision');

const themeStats = computed(() => {
  const counts = { All: reflections.value.length };
  const themeList = ['All'];
  
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    counts[t] = (counts[t] || 0) + 1;
    if (!themeList.includes(t)) themeList.push(t);
  });

  const sortedThemes = themeList.filter(t => t !== 'All' && t !== 'No theme').sort();
  if (themeList.includes('No theme')) sortedThemes.push('No theme');
  
  return ['All', ...sortedThemes].map(t => ({
    name: t,
    count: counts[t]
  }));
});

const childProps = computed(() => ({
  reflections: reflections.value,
  loading: loading.value,
  actionLoading: actionLoading.value,
  themes: themeStats.value
}));

async function loadData() {
  loading.value = true;
  try {
    const data = await getAllPrivateReflections({ limit: 100 });
    reflections.value = data;
  } catch (err) {
    console.error('Failed to load reflections', err);
  } finally {
    loading.value = false;
  }
}

async function handleToggleSupervision(reflection) {
  if (actionLoading.value) return;
  actionLoading.value = reflection.id;
  try {
    const updated = await setReflectionSupervisionSelection({
      reflectionId: reflection.id,
      included: !reflection.included_in_supervision
    });
    const idx = reflections.value.findIndex(r => r.id === reflection.id);
    if (idx !== -1) {
      reflections.value[idx] = { ...reflections.value[idx], ...updated };
    }
    if (selectedReflection.value?.id === reflection.id) {
      selectedReflection.value = { ...selectedReflection.value, ...updated };
    }
  } catch (err) {
    console.error('Toggle error', err);
  } finally {
    actionLoading.value = null;
  }
}

function handleOpenReflection(reflection) {
  initialAIMode.value = false;
  selectedReflection.value = reflection;
}

function handleOpenAIReflection(reflection) {
  initialAIMode.value = true;
  selectedReflection.value = reflection;
}

function closeReflectionModal() {
  selectedReflection.value = null;
  initialAIMode.value = false;
}

function handleGoToSession(reflection) {
  if (reflection.client_id && reflection.session_ref) {
    router.push(`/clients/${reflection.client_id}/sessions/${reflection.session_ref}`);
  }
}

onMounted(loadData);

// Provide state to children if needed
provide('reflections', reflections);
provide('loadData', loadData);
</script>

<style scoped>
.font-fraunces {
  font-family: 'Fraunces', serif;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
