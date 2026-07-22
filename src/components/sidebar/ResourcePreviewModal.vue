<template>
  <transition-colors duration-standard ease-out name="fade">
    <div
        v-if="open && resource"
        class="fixed inset-0 bg-backdrop backdrop-blur-sm flex items-center justify-center z-50"
    >
      <!-- Modal Container -->
      <div
          class="bg-surface-elevated rounded-panel shadow-overlay w-[94%] max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-border-muted"
      >
        <!-- Header -->
        <div class="flex items-start justify-between p-5 border-b border-border-muted bg-surface-subtle">
          <div class="flex items-center gap-3 pr-8">
            <div class="text-h1 leading-none">{{ getIcon(resource.type) }}</div>
            <div>
              <h2 class="text-h3 font-semibold text-ink leading-snug">
                {{ resource.title }}
              </h2>
              <p class="text-body-sm text-ink-muted mt-0.5">
                {{ getTypeLabel(resource.type) }}
                <span v-if="resource.createdAt"> · {{ formatDate(resource.createdAt) }}</span>
              </p>
            </div>
          </div>
          <button
              class="text-ink-muted hover:text-ink-secondary text-h3 leading-none"
              @click="$emit('close')"
              aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-5 bg-surface-subtle">
          <template v-if="resource.type === 'audio'">
            <audio :src="resource.url" controls class="w-full rounded-control"></audio>
          </template>

          <template v-else-if="resource.type === 'video'">
            <video :src="resource.url" controls class="w-full rounded-control "></video>
          </template>

          <template v-else-if="resource.type === 'pdf'">
            <iframe
                :src="resource.url"
                class="w-full h-[65vh] border rounded-control shadow-elevated bg-surface-elevated"
            ></iframe>
          </template>

          <template v-else>
            <div class="flex flex-col items-center justify-center text-center py-8">
              <div class="text-4xl mb-3">🔗</div>
              <p class="text-body text-ink-secondary mb-3">
                This is a link resource.
              </p>
              <a
                  :href="resource.url"
                  target="_blank"
                  class="text-body-sm text-action-link hover:underline"
              >
                Open link in new tab
              </a>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 p-4 border-t border-border-muted bg-surface-elevated">
          <button
              class="px-4 py-2 rounded-control border border-border text-ink-secondary hover:bg-surface-subtle transition-colors duration-standard ease-out"
              @click="$emit('close')"
          >
            Close
          </button>

          <button
              v-if="resource?.url"
              class="px-4 py-2 rounded-control border border-border text-ink-secondary hover:bg-surface-subtle transition-colors duration-standard ease-out"
              @click="downloadResource"
          >
            Download
          </button>

          <button
              class="px-4 py-2 rounded-control bg-action-primary text-on-action hover:bg-action-primary-hover transition-colors duration-standard ease-out"
              @click="$emit('export', resource)"
          >
            Export Resource
          </button>
        </div>
      </div>
    </div>
  </transition-colors duration-standard ease-out>
</template>

<script setup>
const props = defineProps({
  open: Boolean,
  resource: Object,
});

const emit = defineEmits(["close", "export"]);

const getIcon = (type) => {
  switch (type) {
    case "audio":
      return "🎧";
    case "video":
      return "🎥";
    case "pdf":
      return "📄";
    case "link":
    default:
      return "🔗";
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case "audio":
      return "Audio file";
    case "video":
      return "Video file";
    case "pdf":
      return "PDF document";
    case "link":
    default:
      return "External link";
  }
};

const formatDate = (iso) => {
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 1) return "Added today";
  if (diff < 2) return "Added yesterday";
  if (diff < 7) return `Added ${Math.floor(diff)} days ago`;
  return `Added on ${date.toLocaleDateString()}`;
};

const downloadResource = () => {
  if (!props.resource?.url) return;
  const link = document.createElement("a");
  link.href = props.resource.url;
  link.download = props.resource.title || "resource";
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
