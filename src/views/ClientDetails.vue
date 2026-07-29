<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <h2 class="text-h2 font-semibold text-ink">Client Details</h2>
      <div class="flex items-center gap-inline-md">
        <button 
          v-if="hasChanges"
          @click="resetForm"
          class="px-inline-md py-stack-xs text-body-sm font-medium text-ink-secondary hover:text-ink transition-colors"
          :disabled="saving"
        >
          Cancel
        </button>
        <button 
          @click="saveChanges"
          class="px-inline-lg py-stack-xs bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-sm disabled:opacity-50"
          :disabled="saving || !hasChanges"
        >
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="p-inline-md py-stack-sm bg-state-danger/10 text-state-danger text-body-sm rounded-control border border-state-danger/20">
      {{ error }}
    </div>

    <div v-if="success" class="p-inline-md py-stack-sm bg-state-success/10 text-state-success text-body-sm rounded-control border border-state-success/20">
      Changes saved successfully.
    </div>

    <div class="p-inline-md py-stack-sm bg-surface-elevated border border-state-selected/20 rounded-panel text-ink-secondary text-body-sm">
      <p><strong>Note:</strong> Detailed fields (Preferred Name, DOB, Contact info, etc.) are currently in read-only mode until the database migration is completed.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
      <!-- Personal Information -->
      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Personal Information</h3>
        
        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Full Name</label>
          <input 
            v-model="form.name" 
            type="text" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none"
            placeholder="Legal full name"
          />
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Preferred Name</label>
          <input 
            v-model="form.preferred_name" 
            type="text" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none bg-surface-canvas"
            placeholder="How they like to be called"
            disabled
          />
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Date of Birth</label>
          <input 
            v-model="form.date_of_birth" 
            type="date" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none bg-surface-canvas"
            disabled
          />
        </div>
      </section>

      <!-- Contact Information -->
      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Contact Information</h3>
        
        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Phone</label>
          <input 
            v-model="form.phone" 
            type="tel" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none bg-surface-canvas"
            placeholder="Phone number"
            disabled
          />
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Email</label>
          <input 
            v-model="form.email" 
            type="email" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none bg-surface-canvas"
            placeholder="Email address"
            disabled
          />
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Address</label>
          <textarea 
            v-model="form.address" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px] bg-surface-canvas"
            placeholder="Residential address"
            disabled
          ></textarea>
        </div>
      </section>

      <!-- Medical & Emergency -->
      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Medical & Emergency</h3>
        
        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">GP Details</label>
          <textarea 
            v-model="form.gp_details" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px] bg-surface-canvas"
            placeholder="GP name, clinic, and contact info"
            disabled
          ></textarea>
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Emergency Contact</label>
          <textarea 
            v-model="form.emergency_contact" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[80px] bg-surface-canvas"
            placeholder="Name, relationship, and phone"
            disabled
          ></textarea>
        </div>
      </section>

      <!-- Clinical Notes -->
      <section class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg space-y-stack-md">
        <h3 class="text-h3 font-semibold text-ink pt-stack-md mb-stack-sm">Clinical Administration</h3>
        
        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">General Notes</label>
          <textarea 
            v-model="form.notes" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[120px] bg-surface-canvas"
            placeholder="Administrative or general clinical notes"
            disabled
          ></textarea>
        </div>

        <div class="space-y-stack-xs">
          <label class="block text-caption font-semibold text-ink-secondary uppercase tracking-wider">Current Focus (Dashboard)</label>
          <textarea 
            v-model="form.note" 
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none min-h-[60px]"
            placeholder="Quick summary shown in directory and workspace"
          ></textarea>
        </div>
      </section>
    </div>
    
    <div class="flex justify-end pt-stack-md pb-stack-xl">
       <button 
          @click="saveChanges"
          class="px-inline-xl py-stack-md bg-action-link text-body font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-md disabled:opacity-50"
          :disabled="saving || !hasChanges"
        >
          {{ saving ? 'Saving Changes...' : 'Save Changes' }}
        </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { updateClient } from '../lib/clients.js';

const props = defineProps({
  client: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['updated']);

const saving = ref(false);
const error = ref('');
const success = ref(false);

const form = ref({
  name: props.client.name || '',
  preferred_name: props.client.preferred_name || '',
  date_of_birth: props.client.date_of_birth || '',
  phone: props.client.phone || '',
  email: props.client.email || '',
  address: props.client.address || '',
  gp_details: props.client.gp_details || '',
  emergency_contact: props.client.emergency_contact || '',
  notes: props.client.notes || '',
  note: props.client.note || ''
});

const hasChanges = computed(() => {
  return form.value.name !== (props.client.name || '') ||
         form.value.preferred_name !== (props.client.preferred_name || '') ||
         form.value.date_of_birth !== (props.client.date_of_birth || '') ||
         form.value.phone !== (props.client.phone || '') ||
         form.value.email !== (props.client.email || '') ||
         form.value.address !== (props.client.address || '') ||
         form.value.gp_details !== (props.client.gp_details || '') ||
         form.value.emergency_contact !== (props.client.emergency_contact || '') ||
         form.value.notes !== (props.client.notes || '') ||
         form.value.note !== (props.client.note || '');
});

function resetForm() {
  form.value = {
    name: props.client.name || '',
    preferred_name: props.client.preferred_name || '',
    date_of_birth: props.client.date_of_birth || '',
    phone: props.client.phone || '',
    email: props.client.email || '',
    address: props.client.address || '',
    gp_details: props.client.gp_details || '',
    emergency_contact: props.client.emergency_contact || '',
    notes: props.client.notes || '',
    note: props.client.note || ''
  };
  error.value = '';
}

async function saveChanges() {
  if (!hasChanges.value || saving.value) return;
  
  saving.value = true;
  error.value = '';
  success.value = false;
  
  try {
    const updatedClient = await updateClient({
      clientId: props.client.id,
      ...form.value
    });
    success.value = true;
    emit('updated', updatedClient);
    setTimeout(() => {
      success.value = false;
    }, 3000);
  } catch (e) {
    console.error('Failed to update client:', e);
    error.value = e.message || 'Failed to save changes. Please try again.';
  } finally {
    saving.value = false;
  }
}

// Keep form in sync if client changes from outside
watch(() => props.client, (newClient) => {
  if (!hasChanges.value) {
    resetForm();
  }
}, { deep: true });
</script>
