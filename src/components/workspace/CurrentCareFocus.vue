<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg">
    <div class="flex items-center justify-between gap-inline-md pt-stack-md mb-stack-md"><div><h3 class="text-h3 font-semibold text-ink">Current focus</h3><p class="text-caption text-ink-muted mt-1">What seems important in the work right now.</p></div><button type="button" class="text-body-sm font-medium text-action-link hover:underline" @click="$emit('open-care')">View Care</button></div>
    <p v-if="loading" class="text-body-sm text-ink-muted pb-stack-md">Loading Care…</p>
    <div v-else-if="focusItems.length" class="divide-y divide-border pb-stack-sm"><p v-for="item in focusItems.slice(0,3)" :key="item.id" class="py-stack-sm text-body-sm text-ink-secondary leading-relaxed">{{ item.body }}</p></div>
    <p v-else class="text-body-sm text-ink-muted pb-stack-md">No current focus has been recorded yet. Care can emerge gradually from the work.</p>
  </section>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { listClientCareItems } from '../../lib/clientCare.js'
const props = defineProps({ clientId: { type: String, required: true }, refreshKey: { type: Number, default: 0 } })
defineEmits(['open-care'])
const items = ref([]), loading = ref(true)
const focusItems = computed(() => items.value.filter(item => item.kind === 'current_focus' && item.status === 'current'))
async function load() { loading.value = true; try { items.value = await listClientCareItems(props.clientId) } catch (e) { items.value = [] } finally { loading.value = false } }
onMounted(load)
</script>
