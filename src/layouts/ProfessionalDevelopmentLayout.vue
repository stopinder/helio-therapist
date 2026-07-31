<template>
  <div class="flex h-full bg-surface-canvas overflow-hidden">
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute top-0 right-0 w-[40%] h-[40%] bg-surface-muted/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 left-0 w-[35%] h-[35%] bg-surface-muted/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <header
        v-if="!isHome"
        class="border-b border-border-muted bg-surface/80 backdrop-blur-md z-10 shrink-0"
      >
        <div class="px-4 py-4 md:px-8 md:py-5">
          <router-link
            to="/supervision"
            class="inline-flex min-h-touch items-center gap-2 rounded-control px-2 py-2 text-body-sm font-medium text-ink-secondary transition-colors duration-standard hover:bg-surface-subtle hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            <span>Professional Development</span>
          </router-link>

          <div class="mt-2 min-w-0">
            <h1 class="text-h2 font-semibold text-ink">{{ currentTitle }}</h1>
            <p class="text-body-sm text-ink-muted font-fraunces italic mt-1">
              {{ currentSubtitle }}
            </p>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-auto z-10 relative">
        <router-view v-slot="{ Component }">
          <transition name="fade-up" mode="out-in" appear>
            <component
              :is="Component"
              v-bind="childProps"
              @toggle-supervision="handleToggleSupervision"
              @open-reflection="handleOpenReflection"
              @go-to-session="handleGoToSession"
            />
          </transition>
        </router-view>
      </main>
    </div>

    <PrivateReflectionModal
      v-if="selectedReflection"
      :reflection="selectedReflection"
      :loading="actionLoading === selectedReflection.id"
      @close="selectedReflection = null"
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

const isHome = computed(() => route.path === '/supervision');

const currentTitle = computed(() => {
  if (route.path.includes('/reflections')) return 'Review Reflections';
  if (route.path.includes('/workspace')) return 'Supervision Workspace';
  if (route.path.includes('/growth')) return 'Growth & Learning';
  if (route.path.includes('/insights')) return 'Insights';
  return 'Professional Development';
});

const currentSubtitle = computed(() => {
  if (route.path.includes('/reflections')) return 'Browse your reflective journal and revisit previous thinking.';
  if (route.path.includes('/workspace')) return 'Curate reflections for your next supervision session.';
  if (route.path.includes('/growth')) return 'Identify patterns, strengths and opportunities for development.';
  if (route.path.includes('/insights')) return 'Notice recurring patterns across your reflective practice.';
  return '';
});

const themeStats = computed(() => {
  const counts = { All: reflections.value.length };
  const themeList = ['All'];

  reflections.value.forEach(reflection => {
    const theme = reflection.theme || 'No theme';
    counts[theme] = (counts[theme] || 0) + 1;
    if (!themeList.includes(theme)) themeList.push(theme);
  });

  const sortedThemes = themeList.filter(theme => theme !== 'All' && theme !== 'No theme').sort();
  if (themeList.includes('No theme')) sortedThemes.push('No theme');

  return ['All', ...sortedThemes].map(theme => ({
    name: theme,
    count: counts[theme]
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
    const index = reflections.value.findIndex(item => item.id === reflection.id);
    if (index !== -1) {
      reflections.value[index] = { ...reflections.value[index], ...updated };
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
  selectedReflection.value = reflection;
}

function handleGoToSession(reflection) {
  if (reflection.client_id && reflection.session_ref) {
    router.push(`/clients/${reflection.client_id}/sessions/${reflection.session_ref}`);
  }
}

onMounted(loadData);

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

.bg-sage-100 { background-color: var(--surface-subtle); }
.bg-sage-200 { background-color: var(--surface-muted); }
.text-sage-700 { color: var(--text-secondary); }
.border-sage-200 { border-color: var(--border-muted); }

.bg-sage-200\/20 { background-color: rgba(0, 0, 0, 0.05); }
.bg-steel-200\/20 { background-color: rgba(0, 0, 0, 0.05); }
</style>
