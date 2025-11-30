<template>
  <div>
    <h3 class="text-xl font-semibold mb-4 text-[#2c3e50]">
      Therapist Map
    </h3>

    <p class="text-[14px] text-slate-600 mb-6 max-w-2xl">
      This space will display your personal IFS-style map of parts, emotions, and professional modes.
      You’ll be able to explore patterns, triggers, and states of Self-energy that arise across sessions.
      For now, this is a calm visual placeholder.
    </p>

    <div
        class="relative bg-gradient-to-br from-[#f9fafb] to-[#f0f4f8] border border-[#d9dce1] rounded-md shadow-inner p-6 h-[480px] flex flex-col items-center justify-center text-center text-[#3f4754]"
    >
      <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-16 w-16 text-[#94a3b8] mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
      >
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6v6l4 2m-4-8a9 9 0 110 18 9 9 0 010-18z"
        />
      </svg>

      <div class="text-[15px] leading-relaxed max-w-md">
        Your reflective map will appear here.<br />
        Each part, mode, or emotion will be shown as an interactive node.
      </div>

      <div class="absolute bottom-4 text-[12px] text-slate-400 italic">
        Coming soon — powered by Helio’s reflective AI.
      </div>
    </div>
  </div>
</template>

<script setup>
// This component will later receive API data such as therapist parts,
// relationships between them, and reflective states generated via GPT.
// For now, it simply renders a visual placeholder.
</script>
