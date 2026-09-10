<template>
  <div class="h-full bg-surface-canvas overflow-hidden relative">
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-0 right-0 w-[40%] h-[40%] bg-surface-muted/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 left-0 w-[35%] h-[35%] bg-surface-muted/20 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
    </div>

    <header v-if="isChildPage" class="h-16 flex items-center px-6 md:px-10 border-b border-border-muted bg-surface/80 backdrop-blur-md z-20 shrink-0 sticky top-0">
      <router-link to="/supervision" class="flex items-center gap-2 text-ink-secondary hover:text-ink transition-colors group focus-visible:ring-2 focus-visible:ring-state-selected rounded-control px-2 py-1 -ml-2" aria-label="Back to Professional Development">
        <span class="text-xl transition-transform group-hover:-translate-x-1">←</span>
        <span class="text-body-sm font-medium">Professional Development</span>
      </router-link>
    </header>

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
            @edit-reflection="handleEditReflection"
            @delete-reflection="handleDeleteReflection"
          />
        </transition>
      </router-view>
    </main>

    <PrivateReflectionModal
      v-if="selectedReflection"
      :reflection="selectedReflection"
      :loading="actionLoading === selectedReflection.id"
      :error="Boolean(actionError)"
      :initial-ai-mode="initialAIMode"
      @close="closeReflectionModal"
      @toggle-supervision="handleToggleSupervision"
      @go-to-session="handleGoToSession"
    />

    <ReflectionEditModal
      v-if="editingReflection"
      :reflection="editingReflection"
      :saving="actionLoading === editingReflection.id"
      :error="actionError"
      @close="closeEditModal"
      @save="handleSaveReflection"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deletePrivateReflection, getAllPrivateReflections, setReflectionSupervisionSelection, updatePrivateReflectionBody } from '../lib/reflections.js';
import PrivateReflectionModal from '../components/professional-development/PrivateReflectionModal.vue';
import ReflectionEditModal from '../components/professional-development/ReflectionEditModal.vue';

const route = useRoute();
const router = useRouter();
const reflections = ref([]);
const loading = ref(true);
const actionLoading = ref(null);
const actionError = ref('');
const selectedReflection = ref(null);
const editingReflection = ref(null);
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
  return ['All', ...sortedThemes].map(t => ({ name: t, count: counts[t] }));
});
const childProps = computed(() => ({ reflections: reflections.value, loading: loading.value, actionLoading: actionLoading.value, themes: themeStats.value }));

async function loadData() {
  loading.value = true;
  try {
    const data = await getAllPrivateReflections({ limit: 100 });
    reflections.value = data;
    const requestedReflectionId = typeof route.query.aiReflection === 'string' ? route.query.aiReflection : '';
    if (requestedReflectionId) {
      const reflection = reflections.value.find(item => item.id === requestedReflectionId);
      if (reflection) handleOpenAIReflection(reflection);
      else console.warn('[AI Reflection] Saved reflection handoff could not be resolved.');
      await router.replace({ path: route.path, query: { ...route.query, aiReflection: undefined } });
    }
  } catch (err) {
    console.error('Failed to load reflections', err);
  } finally {
    loading.value = false;
  }
}

async function handleToggleSupervision(reflection) {
  if (actionLoading.value) return;
  actionLoading.value = reflection.id;
  actionError.value = '';
  try {
    const updated = await setReflectionSupervisionSelection({ reflectionId: reflection.id, included: !reflection.included_in_supervision });
    replaceReflection(updated);
  } catch (err) {
    console.error('Toggle error', err);
    actionError.value = 'Could not update supervision selection.';
  } finally {
    actionLoading.value = null;
  }
}

function replaceReflection(updated) {
  const idx = reflections.value.findIndex(r => r.id === updated.id);
  if (idx !== -1) reflections.value[idx] = { ...reflections.value[idx], ...updated };
  if (selectedReflection.value?.id === updated.id) selectedReflection.value = { ...selectedReflection.value, ...updated };
  if (editingReflection.value?.id === updated.id) editingReflection.value = { ...editingReflection.value, ...updated };
}

function handleEditReflection(reflection) {
  actionError.value = '';
  if (reflection.workspace_content?.captureSource === 'practice_reflection') {
    router.push('/supervision/practice-reflection');
    return;
  }
  if (reflection.client_id && reflection.session_ref) {
    handleGoToSession(reflection);
    return;
  }
  editingReflection.value = reflection;
}

async function handleSaveReflection(body) {
  if (!editingReflection.value || actionLoading.value) return;
  actionLoading.value = editingReflection.value.id;
  actionError.value = '';
  try {
    const updated = await updatePrivateReflectionBody({ reflectionId: editingReflection.value.id, body });
    replaceReflection(updated);
    editingReflection.value = null;
  } catch (err) {
    console.error('Reflection update error', err);
    actionError.value = err.message || 'Could not update reflection.';
  } finally {
    actionLoading.value = null;
  }
}

async function handleDeleteReflection(reflection) {
  if (actionLoading.value) return;
  const confirmed = window.confirm('Delete this reflection? This cannot be undone. Deleted reflections will not be included in future reflective or longitudinal views.');
  if (!confirmed) return;
  actionLoading.value = reflection.id;
  actionError.value = '';
  try {
    await deletePrivateReflection({ reflectionId: reflection.id });
    reflections.value = reflections.value.filter(item => item.id !== reflection.id);
    if (selectedReflection.value?.id === reflection.id) closeReflectionModal();
    if (editingReflection.value?.id === reflection.id) editingReflection.value = null;
  } catch (err) {
    console.error('Reflection delete error', err);
    actionError.value = err.message || 'Could not delete reflection.';
    window.alert(actionError.value);
  } finally {
    actionLoading.value = null;
  }
}

function handleOpenReflection(reflection) { actionError.value = ''; initialAIMode.value = false; selectedReflection.value = reflection; }
function handleOpenAIReflection(reflection) { actionError.value = ''; initialAIMode.value = true; selectedReflection.value = reflection; }
function closeReflectionModal() { selectedReflection.value = null; initialAIMode.value = false; actionError.value = ''; }
function closeEditModal() { editingReflection.value = null; actionError.value = ''; }
function handleGoToSession(reflection) { if (reflection.client_id && reflection.session_ref) router.push(`/clients/${reflection.client_id}/sessions/${reflection.session_ref}`); }

onMounted(loadData);
provide('reflections', reflections);
provide('loadData', loadData);
</script>

<style scoped>
.font-fraunces { font-family: 'Fraunces', serif; }
.fade-up-enter-active,
.fade-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-up-enter-from { opacity: 0; transform: translateY(20px); }
.fade-up-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
