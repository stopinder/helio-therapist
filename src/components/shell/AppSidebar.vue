<template>
  <div class="flex h-full flex-col bg-sidebar text-sidebar-fg">
    <div class="flex min-h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5 py-3">
      <router-link to="/overview" class="flex min-w-0 items-center gap-2.5 rounded-control focus-visible:outline-sidebar-muted" aria-label="Helios home">
        <span class="icon-surface icon-surface-reflection shrink-0 rounded-pill border-none overflow-hidden">
          <img
            v-if="accountIdentity.practiceLogoUrl"
            :src="accountIdentity.practiceLogoUrl"
            :alt="`${accountIdentity.practiceName || accountIdentity.name || 'Practice'} logo`"
            class="h-full w-full object-cover"
          />
          <span
            v-else-if="accountIdentity.practiceName || accountIdentity.name"
            class="flex h-full w-full items-center justify-center text-[12px] font-semibold text-sidebar-fg"
            aria-hidden="true"
          >
            {{ brandInitial }}
          </span>
          <Sun v-else class="workspace-icon" aria-hidden="true" />
        </span>
        <span
          class="min-w-0 text-[14px] font-semibold leading-tight text-sidebar-fg"
          :title="accountIdentity.practiceName || accountIdentity.name || 'Helios'"
        >
          {{ accountIdentity.practiceName || accountIdentity.name || 'Helios' }}
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

    <div class="shrink-0 border-t border-sidebar-border px-3 py-3 space-y-1">
      <router-link
        to="/settings"
        class="flex min-h-touch items-center gap-2.5 rounded-control px-2.5 type-ui text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
        :class="isNavActive('/settings') ? 'bg-sidebar-active text-sidebar-fg font-semibold' : ''"
        @click="handleNavigation"
      >
        <span class="icon-surface !h-7 !w-7 border-none icon-surface-reflection">
          <Settings class="workspace-icon-sm" aria-hidden="true" />
        </span>
        <span>Settings</span>
      </router-link>

      <button
        type="button"
        class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-2.5 text-left type-ui text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg"
        @click="signOut"
      >
        <span class="icon-surface !h-7 !w-7 border-none">
          <LogOut class="workspace-icon-sm" aria-hidden="true" />
        </span>
        <span>Sign out</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
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
const brandInitial = computed(() => {
  const source = props.accountIdentity.practiceName || props.accountIdentity.name || ''
  return source.trim().charAt(0).toUpperCase()
})

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { name: 'Today', path: '/overview', icon: LayoutDashboard, iconTone: 'icon-surface-accent' },
      { name: 'Clients', path: '/clients', icon: Users, iconTone: 'icon-surface-accent' },
      { name: 'Calendar', path: '/calendar', icon: CalendarDays, iconTone: 'icon-surface-reflection' },
      { name: 'Documents', path: '/documents', icon: FileText, iconTone: 'icon-surface-reflection' }
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

function signOut() {
  emit('sign-out')
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
