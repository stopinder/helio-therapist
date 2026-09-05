<template>
  <div class="flex h-full flex-col">
    <div class="flex h-16 shrink-0 items-center justify-between border-b border-border-muted px-5">
      <router-link to="/overview" class="flex items-center gap-2.5 rounded-control" aria-label="Helios home">
        <span class="icon-surface icon-surface-reflection rounded-pill">
          <Sun class="workspace-icon" aria-hidden="true" />
        </span>
        <span class="leading-none">
          <span class="block font-serif text-[1.35rem] font-semibold text-ink">Helios</span>
          <span class="mt-1 block text-[0.58rem] uppercase tracking-[0.16em] text-ink-muted">Practice</span>
        </span>
      </router-link>

      <button
        v-if="mobile"
        class="-mr-2 p-2 text-ink-subtle hover:text-ink-secondary"
        aria-label="Close menu"
        @click="$emit('close')"
      >
        <X class="workspace-icon-lg" />
      </button>
    </div>

    <div class="relative shrink-0 border-b border-border-muted bg-sidebar px-3 py-2">
      <div
        v-if="accountMenuOpen"
        class="absolute top-[3.35rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay"
        role="menu"
      >
        <router-link
          to="/settings"
          class="flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
          role="menuitem"
          @click="closeAccountMenu"
        >
          <Settings class="workspace-icon-sm" aria-hidden="true" />
          <span>Settings</span>
        </router-link>

        <button
          type="button"
          class="flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink"
          role="menuitem"
          @click="signOut"
        >
          <LogOut class="workspace-icon-sm" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>

      <button
        type="button"
        class="flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-subtle"
        aria-haspopup="menu"
        :aria-expanded="accountMenuOpen"
        @click="accountMenuOpen=!accountMenuOpen"
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-action-primary type-metadata font-semibold text-on-action">
          {{ accountIdentity.initials }}
        </span>
        <span class="min-w-0 flex-1 truncate">
          <span class="block truncate type-ui font-semibold text-ink">{{ accountIdentity.name }}</span>
          <span v-if="accountIdentity.subtitle" class="mt-0.5 block truncate type-metadata text-ink-muted">
            {{ accountIdentity.subtitle }}
          </span>
        </span>
        <MoreHorizontal class="workspace-icon shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    </div>

    <nav class="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
      <section v-for="group in navGroups" :key="group.label">
        <p class="px-3 mb-2 type-eyebrow text-ink-subtle">{{ group.label }}</p>
        <div class="space-y-1">
          <router-link
            v-for="item in group.items"
            :key="item.name"
            :to="item.path"
            class="flex items-center gap-2.5 min-h-touch px-2.5 rounded-control type-ui transition-colors"
            :class="isNavActive(item.path)
              ? 'bg-state-selected text-ink font-semibold'
              : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'"
            @click="handleNavigation"
          >
            <span class="icon-surface !h-7 !w-7" :class="item.iconTone">
              <component :is="item.icon" class="workspace-icon-sm" aria-hidden="true" />
            </span>
            <span>{{ item.name }}</span>
          </router-link>
        </div>
      </section>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
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
const accountMenuOpen = ref(false)

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { name: 'Today', path: '/overview', icon: LayoutDashboard, iconTone: 'icon-surface-accent' },
      { name: 'Clients', path: '/clients', icon: Users, iconTone: 'icon-surface-accent' },
      { name: 'Calendar', path: '/calendar', icon: CalendarDays, iconTone: 'icon-surface-reflection' }
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

function closeAccountMenu() {
  accountMenuOpen.value = false
  if (props.mobile) emit('close')
}

function handleNavigation() {
  accountMenuOpen.value = false
  if (props.mobile) emit('close')
}

function signOut() {
  accountMenuOpen.value = false
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
