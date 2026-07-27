<template>
  <div class="p-inline-lg py-stack-lg">
    <div class="flex items-center justify-between mb-stack-xl">
      <div>
        <h1 class="text-h1 font-semibold text-ink">Clients</h1>
        <p class="mt-2 text-body text-ink-muted">Manage your clinical directory.</p>
      </div>
      <button class="px-inline-md py-stack-sm bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors">
        + Add Client
      </button>
    </div>

    <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-surface-subtle border-b border-border-muted">
          <tr>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Client Name</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Status</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider">Next Appointment</th>
            <th class="px-inline-lg py-stack-md text-caption font-semibold text-ink-secondary uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-muted">
          <tr class="hover:bg-surface-subtle/50 transition-colors">
            <td class="px-inline-lg py-stack-md">
              <div class="font-medium text-ink">{{ mockClient.display_name }}</div>
              <div class="text-caption text-ink-muted">ID: {{ mockClient.id.substring(0, 8) }}...</div>
            </td>
            <td class="px-inline-lg py-stack-md">
              <StatusBadge :status="mockClient.status" />
            </td>
            <td class="px-inline-lg py-stack-md text-body-sm text-ink-secondary">
              {{ mockClient.next_appointment }}
            </td>
            <td class="px-inline-lg py-stack-md text-right">
              <router-link
                :to="`/clients/${mockClient.id}`"
                class="inline-flex items-center px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-action-link rounded-control hover:border-action-link transition-colors"
              >
                Open client
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-stack-lg p-inline-md bg-surface-subtle border border-border-muted rounded-panel">
      <p class="text-body-sm text-ink-muted">Note: Only one example client is shown for testing the Clinical Workspace.</p>
    </div>
  </div>
</template>

<script setup>
import { mockClient } from '../mocks/clientWorkspaceData.js';
import StatusBadge from '../components/workspace/StatusBadge.vue';
</script>
