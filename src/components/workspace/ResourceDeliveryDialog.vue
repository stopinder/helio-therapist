<template>
  <div class="modal-backdrop" @mousedown.self="$emit('close')">
    <article class="w-full max-w-xl rounded-panel border border-border bg-surface-elevated p-inline-lg py-stack-lg shadow-xl" role="dialog" aria-modal="true" aria-labelledby="resource-delivery-title">
      <p class="type-eyebrow text-action-link">Ready to send</p>
      <h2 id="resource-delivery-title" class="mt-2 text-h2 font-semibold text-ink">
        {{ clientEmail ? `Email prepared for ${client.name}` : `Copy the secure link for ${client.name}` }}
      </h2>
      <p class="mt-2 text-body-sm text-ink-secondary">
        {{ clientEmail ? 'Your email app should open with the message already prepared. You can review it before sending.' : 'No email address is saved for this client. Copy the secure link and send it using your usual contact method.' }}
      </p>

      <div class="mt-stack-lg space-y-stack-sm">
        <label v-for="item in links" :key="item.url" class="block">
          <span class="text-body-sm font-medium text-ink">{{ item.title }}</span>
          <input class="mt-1 w-full rounded-control border border-border bg-surface px-inline-sm py-stack-xs text-body-sm text-ink" readonly :value="item.url" @focus="$event.target.select()" />
        </label>
      </div>

      <div class="mt-stack-lg flex flex-wrap justify-end gap-inline-sm">
        <button type="button" class="button-secondary" @click="$emit('close')">Close</button>
        <button type="button" class="button-secondary" @click="copyLinks">{{ copyLabel }}</button>
        <button v-if="clientEmail" type="button" class="button-primary" @click="openEmail">Open email draft</button>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { assignmentCompletionUrl } from '../../lib/clinicalExchange.js'

const props = defineProps({
  client: { type: Object, required: true },
  assignments: { type: Array, default: () => [] },
  clientAccessTokens: { type: Array, default: () => [] }
})

defineEmits(['close'])

const copyLabel = ref('Copy link')
const clientEmail = computed(() => String(props.client?.email || '').trim())
const links = computed(() => props.assignments
  .map((assignment, index) => {
    const token = props.clientAccessTokens[index]
    if (!token) return null
    return {
      title: assignment?.sent_snapshot?.title || 'Helios resource',
      url: assignmentCompletionUrl(token)
    }
  })
  .filter(Boolean))

const mailtoHref = computed(() => {
  if (!clientEmail.value || !links.value.length) return ''
  const subject = 'Secure resource link'
  const resourceLines = links.value.map(item => `${item.title}:\n${item.url}`).join('\n\n')
  const body = `Hello ${props.client?.name || ''},\n\nI’ve sent you the following resource through Helios:\n\n${resourceLines}\n\nPlease use the secure link above to open it. The link expires after 30 days.\n\nIf you have any difficulty opening it, please let me know.`
  return `mailto:${encodeURIComponent(clientEmail.value)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})

function openEmail() {
  if (!mailtoHref.value) return
  const link = document.createElement('a')
  link.href = mailtoHref.value
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function copyLinks() {
  const text = links.value.map(item => `${item.title}: ${item.url}`).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copyLabel.value = links.value.length === 1 ? 'Copied' : 'Links copied'
    setTimeout(() => { copyLabel.value = links.value.length === 1 ? 'Copy link' : 'Copy links' }, 1600)
  } catch {
    copyLabel.value = 'Select and copy'
  }
}

onMounted(async () => {
  copyLabel.value = links.value.length === 1 ? 'Copy link' : 'Copy links'
  if (mailtoHref.value) {
    await nextTick()
    openEmail()
  }
})
</script>
