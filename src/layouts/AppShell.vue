<template>
  <div class="flex h-screen bg-surface-canvas text-ink overflow-hidden">
    <!-- Mobile Sidebar Drawer -->
    <Transition name="slide">
      <aside
        v-if="isMobileMenuOpen"
        class="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border-muted shadow-overlay md:hidden flex flex-col"
      >
        <div class="h-14 flex items-center justify-between px-5 border-b border-border-muted bg-surface-subtle shrink-0">
          <span class="font-semibold text-lg tracking-tight">Helios</span>
          <button
            class="p-2 -mr-2 text-ink-subtle hover:text-ink-secondary"
            @click="isMobileMenuOpen = false"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto p-inline-md space-y-stack-xs">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="item.path"
            @click="isMobileMenuOpen = false"
            class="flex items-center px-inline-md py-stack-sm rounded-control text-body transition-colors duration-standard ease-out"
            :class="$route.path === item.path ? 'bg-state-selected text-ink font-semibold' : 'text-ink-secondary hover:bg-surface-subtle'"
          >
            <span class="mr-3">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </nav>
        <div class="p-inline-md border-t border-border-muted">
          <div class="flex items-center gap-3 px-inline-sm py-stack-sm">
            <div class="h-9 w-9 rounded-pill bg-avatar flex items-center justify-center text-body font-semibold text-ink">
              RO
            </div>
            <div class="flex flex-col min-w-0 leading-tight">
              <span class="text-body font-semibold text-ink truncate">Robert Ormiston</span>
              <span class="text-caption text-ink-muted truncate">Psychotherapist</span>
            </div>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Mobile Backdrop -->
    <Transition name="fade">
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden"
        @click="isMobileMenuOpen = false"
      ></div>
    </Transition>

    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex flex-col w-64 bg-sidebar border-r border-border-muted h-full shrink-0">
      <div class="h-14 flex items-center px-5 border-b border-border-muted font-semibold text-lg tracking-tight bg-surface-subtle">
        Helios
      </div>
      <nav class="flex-1 overflow-y-auto p-inline-md space-y-stack-xs">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="flex items-center px-inline-md py-stack-sm rounded-control text-body transition-colors duration-standard ease-out"
          :class="$route.path === item.path ? 'bg-state-selected text-ink font-semibold' : 'text-ink-secondary hover:bg-surface-subtle'"
        >
          <span class="mr-3">{{ item.icon }}</span>
          {{ item.name }}
        </router-link>
      </nav>
      <div class="p-inline-md border-t border-border-muted">
        <div class="flex items-center gap-3 px-inline-sm py-stack-sm">
          <div class="h-9 w-9 rounded-pill bg-avatar flex items-center justify-center text-body font-semibold text-ink">
            RO
          </div>
          <div class="flex flex-col min-w-0 leading-tight">
            <span class="text-body font-semibold text-ink truncate">Robert Ormiston</span>
            <span class="text-caption text-ink-muted truncate">Psychotherapist</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <!-- Top Header -->
      <header class="h-14 flex items-center justify-between px-inline-lg border-b border-border-muted bg-surface shrink-0">
        <div class="flex items-center gap-inline-md">
          <button
            class="md:hidden p-2 -ml-2 text-ink-secondary hover:bg-surface-subtle rounded-control transition-colors duration-standard ease-out"
            @click="isMobileMenuOpen = true"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 class="text-h3 font-semibold text-ink truncate">{{ currentPageName }}</h2>
        </div>
        <div class="flex items-center gap-inline-md">
          <div class="flex items-center gap-inline-xs px-inline-md py-stack-xs rounded-pill bg-surface-subtle border border-border-muted">
            <span class="h-2 w-2 rounded-pill bg-state-success"></span>
            <span class="text-caption font-medium text-ink-secondary uppercase tracking-wide">Workspace Active</span>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main 
        class="flex-1 bg-surface-canvas relative"
        :class="$route.path === '/calendar' ? 'overflow-hidden' : 'overflow-auto'"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMobileMenuOpen = ref(false)

const navItems = [
  { name: 'Overview', path: '/', icon: '📊' },
  { name: 'Calendar', path: '/calendar', icon: '🗓️' },
  { name: 'Clients', path: '/clients', icon: '👥' },
  { name: 'Transcripts', path: '/transcripts', icon: '📝' },
  { name: 'Professional Development', path: '/supervision', icon: '🌱' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
]

const currentPageName = computed(() => {
  const current = navItems.find(item => item.path === route.path)
  return current ? current.name : 'Workspace'
})
</script>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: transform 0.25s ease-out;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(-100%);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
