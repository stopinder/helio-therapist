<!-- src/components/tools/PartsMap.vue -->
<template>
  <div
      class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto"
  >
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">
      IFS Parts Map
    </h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Visualize internal parts, roles, and relationships. Interactive mapping coming soon.
    </p>

    <!-- Simple demo form for testing save -->
    <div class="space-y-3">
      <label class="block text-[14px] font-medium text-[#3f4754]">
        Part Name
      </label>
      <input
          v-model="form.partName"
          type="text"
          placeholder="e.g. Inner Critic"
          class="w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
               focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc]"
      />

      <label class="block text-[14px] font-medium text-[#3f4754]">
        Role / Function
      </label>
      <textarea
          v-model="form.role"
          rows="2"
          placeholder="e.g. Protects from feeling shame"
          class="w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
               focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc]"
      ></textarea>

      <div class="flex justify-end">
        <button
            v-on:click="save"
            class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540]
                 text-[14px] transition"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from "vue";

const form = reactive({
  partName: "",
  role: ""
});

function save() {
  // ✅ 1. Get the active client ID safely
  const clientId = JSON.parse(localStorage.getItem("helio_selectedClient"))?.id;
  if (!clientId) {
    alert("No client selected — please select a client first.");
    return;
  }

  // ✅ 2. Load all saved tool data or start fresh
  const all = JSON.parse(localStorage.getItem("helio_toolData")) || {};

  // ✅ 3. Save this tool’s data under "clientId_parts-map"
  all[`${clientId}_parts-map`] = {
    ...form,
    savedAt: new Date().toISOString()
  };

  // ✅ 4. Write back to localStorage
  localStorage.setItem("helio_toolData", JSON.stringify(all));

  alert("Parts Map saved for this client!");
  window.dispatchEvent(new CustomEvent('tool-saved'))

}
</script>

