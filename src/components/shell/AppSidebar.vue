<template>
  <div class="flex h-full flex-col bg-sidebar text-sidebar-fg">
    <div class="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
      <router-link to="/overview" class="flex min-w-0 items-center gap-2.5 rounded-control focus-visible:outline-sidebar-muted" aria-label="Helios home">
        <img
          v-if="accountIdentity.practiceLogoUrl"
          :src="accountIdentity.practiceLogoUrl"
          alt=""
          class="h-9 w-9 shrink-0 rounded-control object-contain"
        />
        <span v-else class="icon-surface icon-surface-reflection rounded-pill border-none">
          <Sun class="workspace-icon" aria-hidden="true" />
        </span>
        <span class="min-w-0 leading-none">
          <span class="block font-serif text-[1.35rem] font-semibold text-sidebar-fg">Helios</span>
          <span class="mt-1 block truncate text-[0.58rem] uppercase tracking-[0.16em] text-sidebar-muted">
            {{ accountIdentity.practiceName || 'Practice' }}
          </span>
        </span>
      </router-link>

      <button
        v-if="mobile"
        class="-mr-2 p-2 text-sidebar-muted hover:text-sidebar-fg"
        aria-label="Close menu"
        @click="$emit('close')"
      >
        <X class="workspace-icon-lg" />
      </button>
    </div>

    <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
      <section v-for="group in navGroups" :key="group.label">
        <p class="px-3 mb-2 type-eyebrow text-sidebar-muted/60">{{ group.label }}</p>
        <div class="space-y-1">
          <router-link
            v-for="item in group.items"
            :key="item.name"
            :to="item.path"
            class="group relative flex items-center gap-2.5 min-h-touch px-2.5 rounded-control type-ui transition-all duration-150"
            :class="isNavActive(item.path)
              ? 'bg-sidebar-active text-sidebar-fg font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg hover:translate-x-0.5'"
            @click="handleNavigation"
          >
            <div
              v-if="isNavActive(item.path)"
              class="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span class="icon-surface !h-7 !w-7 border-none" :class="item.iconTone">
              <component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" />
            </span>
            <span>{{ item.name }}</span>
          </router-link>
        </div>
      </section>
    </nav>

    <div class="shrink-0 border-t border-sidebar-border p-3">
      <router-link
        to="/settings"
        class="flex min-h-touch items-center gap-2.5 rounded-control px-2.5 type-ui text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
        @click="handleNavigation"
      >
        <span class="icon-surface !h-7 !w-7 border-none icon-surface-reflection">
          <Settings class="workspace-icon-sm" aria-hidden="true" />
        </span>
        <span>Settings</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import {
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sun,
  Users,
  X
} from '@lucide/vue'

const props = defineProps({
  mobile: Boolean,
  accountIdentity: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'sign-out'])
const route = useRoute()

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { name: 'Today', path: '/overview', icon: LayoutDashboard, iconTone: 'icon-surface-accent' },
      { name: 'Clients', path: '/clients', icon: Users, iconTone: 'icon-surface-accent' },
      { name: 'Calendar', path: '/calendar', icon: CalendarDays, iconTone: 'icon-surface-reflection' },
      { name: 'Transcript Inbox', path: '/transcripts', icon: FileText, iconTone: 'icon-surface-reflection' }
    ]
  },
  {
    label: 'Reflection',
    items: [
      { name: 'Reflect', path: '/supervision', icon: GraduationCap, iconTone: 'icon-surface-reflection' }
    ]
  }
]

function isNavActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function handleNavigation() {
  if (props.mobile) emit('close')
}
</script>

<style scoped>
.sidebar-navigation {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sidebar-navigation::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>
