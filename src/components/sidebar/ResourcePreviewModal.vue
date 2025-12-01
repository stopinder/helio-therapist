<template>
  <transition name="fade">
    <div
        v-if="open && resource"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <!-- Modal Container -->
      <div
          class="bg-white rounded-xl shadow-2xl w-[94%] max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-[#e5e7eb]"
      >
        <!-- Header -->
        <div class="flex items-start justify-between p-5 border-b border-[#e5e7eb] bg-[#fafbfc]">
          <div class="flex items-center gap-3 pr-8">
            <div class="text-2xl leading-none">{{ getIcon(resource.type) }}</div>
            <div>
              <h2 class="text-[17px] font-semibold text-[#2c3e50] leading-snug">
                {{ resource.title }}
              </h2>
              <p class="text-[13px] text-slate-500 mt-0.5">
                {{ getTypeLabel(resource.type) }}
                <span v-if="resource.createdAt"> · {{ formatDate(resource.createdAt) }}</span>
              </p>
            </div>
          </div>
          <button
              class="text-slate-500 hover:text-slate-700 text-lg leading-none"
              @click="$emit('close')"
              aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-5 bg-[#f9fafb]">
          <template v-if="resource.type === 'audio'">
            <audio :src="resource.url" controls class="w-full rounded-md"></audio>
          </template>

          <template v-else-if="resource.type === 'video'">
            <video :src="resource.url" controls class="w-full rounded-md shadow-sm"></video>
          </template>

          <template v-else-if="resource.type === 'pdf'">
            <iframe
                :src="resource.url"
                class="w-full h-[65vh] border rounded-md shadow-inner bg-white"
            ></iframe>
          </template>

          <template v-else>
            <div class="flex flex-col items-center justify-center text-center py-8">
              <div class="text-4xl mb-3">🔗</div>
              <p class="text-[14px] text-slate-600 mb-3">
                This is a link resource.
              </p>
              <a
                  :href="resource.url"
                  target="_blank"
                  class="text-[13px] text-[#2563eb] hover:underline"
              >
                Open link in new tab
              </a>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 p-4 border-t border-[#e5e7eb] bg-white">
          <button
              class="px-4 py-2 rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition"
              @click="$emit('close')"
          >
            Close
          </button>

          <button
              v-if="resource?.url"
              class="px-4 py-2 rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition"
              @click="downloadResource"
          >
            Download
          </button>

          <button
              class="px-4 py-2 rounded-md bg-[#3f4754] text-white hover:bg-[#2f3540] transition"
              @click="$emit('export', resource)"
          >
            Export Resource
          </button>
        </div>
      </div>
    </div>
  </transition>
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
