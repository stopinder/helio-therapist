<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <h2 class="text-h2 font-semibold text-ink">Client Details</h2>
      <div class="flex items-center gap-inline-md">
        <button v-if="hasChanges" @click="resetForm" class="px-inline-md py-stack-xs text-body-sm font-medium text-ink-secondary hover:text-ink transition-colors" :disabled="saving">Cancel</button>
        <button @click="saveChanges" class="px-inline-lg py-stack-xs bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-sm disabled:opacity-50" :disabled="saving || !hasChanges">{{ saving ? 'Saving...' : 'Save Changes' }}</button>
      </div>
    </div>

    <div v-if="error" class="p-inline-md py-stack-sm bg-state-danger/10 text-state-danger text-body-sm rounded-control border border-state-danger/20">{{ error }}</div>
    <div v-if="success" class="p-inline-md py-stack-sm bg-state-success/10 text-state-success text-body-sm rounded-control border border-state-success/20">Changes saved successfully.</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Personal Information</h3>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Full Name</label><input v-model="form.name" type="text" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none" placeholder="Legal full name" /></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Preferred Name</label><input v-model="form.preferred_name" type="text" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none" placeholder="How they like to be called" /></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Date of Birth</label><input v-model="form.date_of_birth" type="date" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none" /></div>
      </section>

      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Contact Information</h3>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Phone</label><input v-model="form.phone" type="tel" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none" placeholder="Phone number" /></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Email</label><input v-model="form.email" type="email" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none" placeholder="Email address" /></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Address</label><textarea v-model="form.address" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px]" placeholder="Residential address"></textarea></div>
      </section>

      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Medical & Emergency</h3>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">GP Details</label><textarea v-model="form.gp_details" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px]" placeholder="GP name, clinic, and contact info"></textarea></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Emergency Contact</label><textarea v-model="form.emergency_contact" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px]" placeholder="Name, relationship, and phone"></textarea></div>
      </section>

      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Clinical Administration</h3>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">General Notes</label><textarea v-model="form.notes" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[120px]" placeholder="Administrative or general clinical notes"></textarea></div>
        <div class="space-y-stack-xs"><label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Current Focus (Dashboard)</label><textarea v-model="form.note" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[60px]" placeholder="Quick summary shown in directory and workspace"></textarea></div>
      </section>
    </div>

    <div class="flex justify-end pt-stack-md pb-stack-xl"><button @click="saveChanges" class="px-inline-xl py-stack-md bg-action-link text-body font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-md disabled:opacity-50" :disabled="saving || !hasChanges">{{ saving ? 'Saving Changes...' : 'Save Changes' }}</button></div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { updateClient } from '../lib/clients.js'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const saving = ref(false)
const error = ref('')
const success = ref(false)

const makeForm = client => ({
  name: client.name || '', preferred_name: client.preferred_name || '', date_of_birth: client.date_of_birth || '', phone: client.phone || '', email: client.email || '', address: client.address || '', gp_details: client.gp_details || '', emergency_contact: client.emergency_contact || '', notes: client.notes || '', note: client.note || ''
})
const form = ref(makeForm(props.client))
const hasChanges = computed(() => JSON.stringify(form.value) !== JSON.stringify(makeForm(props.client)))

function resetForm() { form.value = makeForm(props.client); error.value = '' }
async function saveChanges() {
  if (!hasChanges.value || saving.value) return
  saving.value = true; error.value = ''; success.value = false
  try { const updatedClient = await updateClient({ clientId: props.client.id, ...form.value }); success.value = true; emit('updated', updatedClient); setTimeout(() => { success.value = false }, 3000) }
  catch (e) { console.error('Failed to update client:', e); error.value = e.message || 'Failed to save changes. Please try again.' }
  finally { saving.value = false }
}
watch(() => props.client, () => { if (!hasChanges.value) resetForm() }, { deep: true })
</script>
