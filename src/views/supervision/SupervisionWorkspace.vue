<template>
  <div class="p-4 md:p-10 max-w-6xl mx-auto space-y-10 animate-fadeUp">
    <header>
      <div class="flex items-center gap-3">
        <h1 class="text-h2 font-semibold text-ink">Supervision Workspace</h1>
        <span class="px-2 py-0.5 bg-surface-subtle text-ink-secondary text-overline font-bold uppercase tracking-wider rounded-pill border border-border-muted">
          Workspace
        </span>
      </div>
      <p class="text-body-sm text-ink-muted font-fraunces italic mt-1">
        Curate reflections for your next supervision session.
      </p>
    </header>

    <div class="bg-surface-elevated rounded-[2rem] border border-border-muted shadow-sm overflow-hidden min-h-[600px] flex flex-col relative">
      <SupervisionPackView
        :reflections="supervisionPackReflections"
        :selected-reflections="reportSelectedReflections"
        :report-selected-ids="reportSelectedIds"
        :expanded-preparation-id="expandedPreparationId"
        :pack-item-options="packItemOptions"
        :client-aliases="clientAliases"
        :action-loading="actionLoading"
        @create-report="openExportPreview"
        @toggle-report-selection="toggleReportSelection"
        @go-to-session="r => $emit('go-to-session', r)"
        @open-reflection="r => $emit('open-reflection', r)"
        @toggle-preparation="togglePreparation"
        @remove-from-pack="r => $emit('toggle-supervision', r)"
      />

      <SupervisionReportPreview
        v-if="exportPreviewOpen"
        :reflections="reportSelectedReflections"
        :options="exportOptions"
        :pack-item-options="packItemOptions"
        :client-aliases="clientAliases"
        :introduction="therapistIntroduction"
        :copying="copying"
        @close="closeExportPreview"
        @update-option="(key, val) => exportOptions[key] = val"
        @update-introduction="val => therapistIntroduction = val"
        @copy="copyExportText"
        @print="printPack"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import SupervisionPackView from '../../components/professional-development/SupervisionPackView.vue';
import SupervisionReportPreview from '../../components/professional-development/SupervisionReportPreview.vue';

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean,
  actionLoading: [String, Number]
});

defineEmits(['open-reflection', 'go-to-session', 'toggle-supervision']);

const reportSelectedIds = ref(new Set());
const expandedPreparationId = ref(null);
const packItemOptions = ref({});
const exportPreviewOpen = ref(false);
const therapistIntroduction = ref('');
const copying = ref(false);

const exportOptions = ref({
  includeText: true,
  includeThemes: true,
  includeDates: true,
  includeClientReferences: false
});

const supervisionPackReflections = computed(() => {
  return props.reflections.filter(r => r.included_in_supervision);
});

const reportSelectedReflections = computed(() => {
  return supervisionPackReflections.value.filter(r => reportSelectedIds.value.has(r.id));
});

const clientAliases = computed(() => {
  const aliases = {};
  let count = 0;
  const clientNames = [...new Set(reportSelectedReflections.value.map(r => r.clients?.display_name).filter(Boolean))];
  clientNames.forEach(name => {
    aliases[name] = `Case ${String.fromCharCode(65 + count)}`;
    count++;
  });
  return aliases;
});

// Initialize report selection when reflections load
watch(() => props.reflections, (newReflections) => {
  newReflections.forEach(r => {
    if (r.included_in_supervision && !reportSelectedIds.value.has(r.id)) {
      reportSelectedIds.value.add(r.id);
      if (!packItemOptions.value[r.id]) {
        packItemOptions.value[r.id] = {
          includeText: true,
          includeDate: true,
          includeTheme: true
        };
      }
    }
  });
}, { immediate: true, deep: true });

function openExportPreview() {
  exportPreviewOpen.value = true;
}

function closeExportPreview() {
  exportPreviewOpen.value = false;
}

function toggleReportSelection(id) {
  if (reportSelectedIds.value.has(id)) {
    reportSelectedIds.value.delete(id);
  } else {
    reportSelectedIds.value.add(id);
    if (!packItemOptions.value[id]) {
      packItemOptions.value[id] = {
        includeText: true,
        includeDate: true,
        includeTheme: true
      };
    }
  }
}

function togglePreparation(id) {
  expandedPreparationId.value = expandedPreparationId.value === id ? null : id;
}

function printPack() {
  window.print();
}

async function copyExportText() {
  if (copying.value) return;
  copying.value = true;
  
  try {
    let text = "SUPERVISION REPORT\n";
    text += `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
    
    if (therapistIntroduction.value) {
      text += `${therapistIntroduction.value}\n\n`;
    }
    
    reportSelectedReflections.value.forEach(r => {
      const opts = packItemOptions.value[r.id] || { includeText: true, includeDate: true, includeTheme: true };

      if (opts.includeDate) {
        text += `DATE: ${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
      }
      
      if (opts.includeTheme && r.theme) {
        text += `THEME: ${r.theme}\n`;
      }
      
      const clientRef = exportOptions.value.includeClientReferences && r.clients?.display_name 
        ? r.clients.display_name 
        : (r.clients?.display_name ? clientAliases.value[r.clients.display_name] : 'Anonymous');
      text += `CASE: ${clientRef}\n`;
      
      if (opts.includeText) {
        text += `\n"${r.body}"\n\n`;
      } else {
        text += `\n`;
      }
      text += `-------------------\n\n`;
    });
    
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  } finally {
    setTimeout(() => {
      copying.value = false;
    }, 1000);
  }
}
</script>
