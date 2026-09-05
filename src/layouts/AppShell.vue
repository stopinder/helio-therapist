<template>
  <div class="flex h-screen overflow-hidden bg-surface-canvas text-ink">
    <Transition name="slide">
      <aside v-if="isMobileMenuOpen" class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-muted bg-sidebar shadow-overlay md:hidden">
        <ShellSidebar mobile @close="isMobileMenuOpen=false" />
      </aside>
    </Transition>

    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden" @click="isMobileMenuOpen=false"></div>

    <aside class="hidden h-full w-64 shrink-0 flex-col border-r border-border-muted bg-sidebar md:flex">
      <ShellSidebar />
    </aside>

    <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-border-muted bg-surface px-inline-lg md:px-6">
        <div class="flex min-w-0 items-center gap-inline-md">
          <button class="-ml-2 rounded-control p-2 text-ink-secondary hover:bg-surface-subtle md:hidden" aria-label="Open menu" @click="isMobileMenuOpen=true">
            <Menu class="workspace-icon-lg" />
          </button>
          <h2 class="truncate type-body-medium text-ink">{{ currentPageName }}</h2>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-muted bg-surface px-3 type-ui text-ink-secondary hover:bg-surface-subtle" :aria-expanded="showQuickCapture" @click="showQuickCapture=!showQuickCapture">
            <Plus class="workspace-icon-sm text-focus" aria-hidden="true" />
            <span class="hidden sm:inline">Quick capture</span>
            <span v-if="outstandingReminderCount" class="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-brand-amber/15 px-1.5 type-metadata font-semibold">{{ outstandingReminderCount }}</span>
          </button>
          <router-link v-if="$route.path!=='/schedule'" to="/schedule" class="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-muted bg-surface px-3 type-ui text-ink-secondary hover:bg-surface-subtle" aria-label="Schedule appointment">
            <CalendarDays class="workspace-icon-sm text-accent" aria-hidden="true" />
            <span class="hidden lg:inline">Schedule</span>
          </router-link>
        </div>
      </header>

      <main class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface-canvas"><slot /></main>
    </div>

    <GlobalQuickCapture v-if="showQuickCapture" :reminders="openReminders" @close="showQuickCapture=false" @saved="refreshReminders" @changed="refreshReminders" />
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CalendarDays, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Settings, Sun, Users, GraduationCap, X } from '@lucide/vue'
import { supabase } from '../lib/supabase.js'
import { listTherapistReminders } from '../lib/therapistReminders.js'
import GlobalQuickCapture from '../components/reminders/GlobalQuickCapture.vue'

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)
const accountMenuOpen = ref(false)
const showQuickCapture = ref(false)
const reminders = ref([])
const accountIdentity = ref({ name: 'Signed in', initials: '·' })

const navGroups = [
  { label: 'Workspace', items: [
    { name: 'Today', path: '/overview', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Calendar', path: '/calendar', icon: CalendarDays }
  ]},
  { label: 'Reflection', items: [
    { name: 'Reflect', path: '/supervision', icon: GraduationCap }
  ]}
]

const pageTitles = { '/overview':'Today', '/calendar':'Calendar', '/schedule':'Schedule appointment', '/clients':'Clients', '/supervision':'Reflect', '/settings':'Settings', '/transcripts':'Transcript inbox', '/documents':'Practice documents' }
const currentPageName = computed(() => pageTitles[route.path] || route.meta?.title?.replace(' — Helios','') || 'Helios')
const openReminders = computed(() => reminders.value.filter(item => !item.completedAt))
const outstandingReminderCount = computed(() => openReminders.value.length)

function isNavActive(path) { return route.path === path || route.path.startsWith(`${path}/`) }
function initialsFor(value) { return String(value||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('') || '·' }
async function refreshReminders() { try { reminders.value = await listTherapistReminders() } catch { reminders.value = [] } }
async function loadAccountIdentity() {
  if (!supabase) return
  try {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    const { data:profile } = await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle()
    const name = profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email || 'Signed in'
    accountIdentity.value = { name, initials:initialsFor(name) }
  } catch { /* identity is optional */ }
}
async function handleSignOut() { if (supabase) await supabase.auth.signOut(); await router.replace('/sign-in') }

const ShellSidebar = defineComponent({
  props:{ mobile:Boolean }, emits:['close'],
  setup(props,{emit}) {
    return () => h('div',{class:'flex h-full flex-col'},[
      h('div',{class:'flex h-16 shrink-0 items-center justify-between border-b border-border-muted px-5'},[
        h(RouterLink,{to:'/overview',class:'flex items-center gap-2.5 rounded-control','aria-label':'Helios home'},{default:()=>[
          h('span',{class:'icon-surface icon-surface-reflection rounded-pill'},[h(Sun,{class:'workspace-icon'})]),
          h('span',{class:'font-serif text-[1.35rem] font-semibold text-ink'},'Helios')
        ]}),
        props.mobile ? h('button',{class:'p-2 text-ink-subtle','aria-label':'Close menu',onClick:()=>emit('close')},[h(X,{class:'workspace-icon-lg'})]) : null
      ]),
      h('div',{class:'relative shrink-0 border-b border-border-muted px-3 py-2'},[
        accountMenuOpen.value ? h('div',{class:'absolute top-[3.35rem] left-3 right-3 z-50 rounded-panel border border-border-muted bg-surface-overlay p-1.5 shadow-overlay',role:'menu'},[
          h(RouterLink,{to:'/settings',class:'flex min-h-touch items-center gap-2.5 rounded-control px-3 type-ui text-ink-secondary hover:bg-surface-subtle',role:'menuitem',onClick:()=>accountMenuOpen.value=false},{default:()=>[h(Settings,{class:'workspace-icon-sm'}),h('span','Settings')]}),
          h('button',{type:'button',class:'flex min-h-touch w-full items-center gap-2.5 rounded-control px-3 text-left type-ui text-ink-secondary hover:bg-surface-subtle',role:'menuitem',onClick:handleSignOut},[h(LogOut,{class:'workspace-icon-sm'}),h('span','Sign out')])
        ]) : null,
        h('button',{type:'button',class:'flex min-h-touch w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-subtle','aria-label':`Account menu for ${accountIdentity.value.name}`,'aria-expanded':accountMenuOpen.value,onClick:()=>accountMenuOpen.value=!accountMenuOpen.value},[
          h('span',{class:'flex h-8 w-8 items-center justify-center rounded-pill bg-action-primary type-metadata font-semibold text-on-action'},accountIdentity.value.initials),
          h('span',{class:'min-w-0 flex-1 truncate type-ui font-semibold'},accountIdentity.value.name),h(MoreHorizontal,{class:'workspace-icon text-ink-muted'})
        ])
      ]),
      h('nav',{class:'flex-1 overflow-y-auto px-3 py-4 space-y-6'},navGroups.map(group=>h('section',{key:group.label},[
        h('p',{class:'px-3 mb-2 type-eyebrow text-ink-subtle'},group.label),
        h('div',{class:'space-y-1'},group.items.map(item=>h(RouterLink,{to:item.path,class:['flex min-h-touch items-center gap-2.5 rounded-control px-2.5 type-ui transition-colors',isNavActive(item.path)?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle'],onClick:()=>props.mobile&&emit('close')},{default:()=>[h(item.icon,{class:'workspace-icon-sm text-accent'}),h('span',item.name)]})))
      ])))
    ])
  }
})

onMounted(() => { loadAccountIdentity(); refreshReminders() })
</script>

<style scoped>
.slide-enter-active,.slide-leave-active{transition:transform .2s ease-out}.slide-enter-from,.slide-leave-to{transform:translateX(-100%)}
</style>
