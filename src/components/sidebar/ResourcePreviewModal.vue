<template>
  <div
      v-if="open && resource"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <!-- scrollable container -->
    <div
        class="bg-white rounded-lg shadow-xl w-[92%] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-5 border-b border-[#e5e7eb]">
        <div class="flex items-center gap-3 pr-8">
          <span class="text-2xl">{{ getIcon(resource.type) }}</span>
          <div>
            <h2 class="text-lg font-semibold text-[#2c3e50] leading-tight">
              {{ resource.title }}
            </h2>
            <p class="text-[13px] text-slate-500">
              {{ getTypeLabel(resource.type) }}
              <span v-if="resource.createdAt">
                · {{ formatDate(resource.createdAt) }}
              </span>
            </p>
          </div>
        </div>

        <button
            class="text-slate-500 hover:text-slate-700 text-lg"
            @click="$emit('close')"
            aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto p-5 bg-[#fafbfc]">
        <template v-if="resource.type === 'audio'">
          <audio :src="resource.url" controls class="w-full"></audio>
        </template>

        <template v-else-if="resource.type === 'video'">
          <video :src="resource.url" controls class="w-full rounded-md"></video>
        </template>

        <template v-else-if="resource.type === 'pdf'">
          <iframe
              :src="resource.url"
              class="w-full h-[60vh] md:h-[70vh] border rounded-md"
          ></iframe>
        </template>

        <template v-else>
          <div class="flex flex-col items-center justify-center text-center py-6">
            <div class="text-3xl mb-2">🔗</div>
            <p class="text-[14px] text-slate-600 mb-3">
              This is a link resource.
            </p>
            <a
                :href="resource.url"
                target="_blank"
                class="text-[13px] text-[#2563eb] hover:underline"
            >Open link in new tab</a
            >
          </div>
        </template>
      </div>

      <!-- Sticky footer -->
      <div
          class="flex justify-end gap-2 p-4 border-t border-[#e5e7eb] bg-white sticky bottom-0"
      >
        <button
            class="px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] hover:bg-[#f5f7fa] transition"
            @click="$emit('close')"
        >
          Close
        </button>
        <button
            class="px-3 py-1.5 rounded-md bg-[#3f4754] text-white hover:bg-[#2f3540] transition"
            @click="$emit('export', resource)"
        >
          Export Resource
        </button>
      </div>
    </div>
  </div>
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
</script>
