<template>
  <div class="flex h-full bg-surface-canvas overflow-hidden">
    <!-- Workspace Sidebar -->
    <aside class="w-64 bg-sidebar border-r border-border-muted flex flex-col shrink-0">
      <div class="h-16 flex items-center px-6 border-b border-border-muted font-fraunces text-xl font-semibold text-ink">
        Helios
      </div>
      
      <nav class="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="flex items-center px-4 py-2.5 rounded-panel text-body-sm transition-all duration-standard"
          :class="isActive(item.path) ? 'bg-state-selected text-ink font-semibold shadow-sm' : 'text-ink-secondary hover:bg-surface-subtle'"
        >
          <span class="mr-3 text-lg">{{ item.icon }}</span>
          {{ item.name }}
        </router-link>
      </nav>

      <!-- Practice Section -->
      <div class="p-6 border-t border-border-muted bg-surface-subtle">
        <h3 class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-4">Practice</h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-caption text-ink-secondary">Reflections</span>
            <span class="text-caption font-semibold text-ink">{{ stats.reflectionsCount }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-caption text-ink-secondary">Leading Theme</span>
            <span class="text-caption font-semibold text-ink truncate ml-2 max-w-[100px]" :title="stats.leadingTheme">
              {{ stats.leadingTheme }}
            </span>
          </div>
          <div class="pt-2 border-t border-border-muted/50">
            <span class="text-overline text-ink-muted uppercase block mb-1">Latest Reflection</span>
            <span class="text-caption text-ink-secondary italic block truncate">
              {{ stats.latestReflectionDate }}
            </span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <!-- Background Shapes -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute top-0 right-0 w-[40%] h-[40%] bg-surface-muted/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 left-0 w-[35%] h-[35%] bg-surface-muted/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <!-- Header -->
      <header v-if="showHeader" class="h-24 flex items-center justify-between px-10 border-b border-border-muted bg-surface/80 backdrop-blur-md z-10 shrink-0">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-h2 font-semibold text-ink">{{ currentTitle }}</h1>
            <span class="px-2 py-0.5 bg-surface-subtle text-ink-secondary text-overline font-bold uppercase tracking-wider rounded-pill border border-border-muted">
              Workspace
            </span>
          </div>
          <p class="text-body-sm text-ink-muted font-fraunces italic mt-1">
            {{ currentSubtitle }}
          </p>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Action buttons could go here -->
        </div>
      </header>

      <!-- View Content -->
      <main class="flex-1 overflow-auto z-10 relative">
        <router-view v-slot="{ Component }">
          <transition name="fade-up" mode="out-in">
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

    <!-- Modals (Shared across sub-views) -->
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

const navItems = [
  { name: 'Home', path: '/supervision', icon: '🏠' },
  { name: 'Review Reflections', path: '/supervision/reflections', icon: '📓' },
  { name: 'Supervision Workspace', path: '/supervision/workspace', icon: '💼' },
  { name: 'Growth & Learning', path: '/supervision/growth', icon: '📈' },
  { name: 'Insights', path: '/supervision/insights', icon: '✨' },
];

const showHeader = computed(() => route.path !== '/supervision');

const currentTitle = computed(() => {
  if (route.path.includes('/reflections')) return 'Review Reflections';
  if (route.path.includes('/workspace')) return 'Supervision Workspace';
  if (route.path.includes('/growth')) return 'Growth & Learning';
  if (route.path.includes('/insights')) return 'Insights';
  return '';
});

const currentSubtitle = computed(() => {
  if (route.path.includes('/reflections')) return 'Browse your reflective journal and revisit previous thinking.';
  if (route.path.includes('/workspace')) return 'Curate reflections for your next supervision session.';
  if (route.path.includes('/growth')) return 'Identify patterns, strengths and opportunities for development.';
  if (route.path.includes('/insights')) return 'Understand trends across your reflective practice.';
  return '';
});

const stats = computed(() => {
  const count = reflections.value.length;
  const latest = reflections.value[0];
  
  const themeMap = {};
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    themeMap[t] = (themeMap[t] || 0) + 1;
  });
  const leadingTheme = Object.entries(themeMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return {
    reflectionsCount: count,
    leadingTheme: leadingTheme,
    latestReflectionDate: latest ? new Date(latest.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'None'
  };
});

const childProps = computed(() => ({
  reflections: reflections.value,
  loading: loading.value,
  actionLoading: actionLoading.value
}));

const isActive = (path) => {
  if (path === '/supervision') return route.path === '/supervision';
  return route.path.startsWith(path);
};

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
  selectedReflection.value = reflection;
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
  transition: all 0.3s ease-out;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
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
