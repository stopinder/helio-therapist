<template>
  <div class="flex h-screen bg-surface-canvas text-ink overflow-hidden">
    <Transition name="slide">
      <aside v-if="isMobileMenuOpen" class="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border-muted shadow-overlay md:hidden flex flex-col">
        <div class="h-16 flex items-center justify-between px-5 border-b border-border-muted shrink-0"><BrandLockup/><button class="p-2 -mr-2 text-ink-subtle hover:text-ink-secondary" @click="isMobileMenuOpen=false" aria-label="Close menu"><XMarkIcon class="h-5 w-5" /></button></div>
        <SidebarNavigation :groups="navGroups" :current-path="$route.path" @navigate="isMobileMenuOpen=false" />
        <SidebarAccount :account="accountIdentity" @sign-out="handleSignOut" />
      </aside>
    </Transition>
    <Transition name="fade"><div v-if="isMobileMenuOpen" class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden" @click="isMobileMenuOpen=false"></div></Transition>
    <aside class="hidden md:flex flex-col w-64 bg-sidebar border-r border-border-muted h-full shrink-0">
      <div class="h-16 flex items-center px-5 border-b border-border-muted shrink-0"><BrandLockup/></div>
      <SidebarNavigation :groups="navGroups" :current-path="$route.path" />
      <SidebarAccount :account="accountIdentity" @sign-out="handleSignOut" />
    </aside>
    <div class="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden">
      <header class="h-16 flex items-center justify-between px-inline-lg md:px-6 border-b border-border-muted bg-surface shrink-0">
        <div class="flex items-center gap-inline-md"><button class="md:hidden p-2 -ml-2 text-ink-secondary hover:bg-surface-subtle rounded-control" @click="isMobileMenuOpen=true" aria-label="Open menu"><Bars3Icon class="h-5 w-5" /></button><h2 class="type-body-medium text-ink truncate">{{ currentPageName }}</h2></div>
        <div class="flex items-center gap-2 md:gap-inline-md">
          <div class="hidden md:flex items-center gap-2 text-ink-secondary whitespace-nowrap" data-testid="global-session-clock" aria-live="off">
            <time class="type-body-medium tabular-nums text-ink" :datetime="now.toISOString()">{{ currentTimeLabel }}</time>
            <span class="text-border" aria-hidden="true">·</span>
            <span v-if="nextAppointment" class="type-metadata">Next session {{ nextSessionTimeLabel }} <span class="text-ink-muted">· {{ nextSessionCountdownLabel }}</span></span>
            <span v-else class="type-metadata text-ink-muted">No upcoming session</span>
          </div>
          <button type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-control border type-ui transition-colors" :class="outstandingReminderCount ? 'border-brand-amber/50 bg-brand-amber-soft text-ink' : 'border-border-muted bg-surface text-ink-secondary hover:bg-surface-subtle'" :aria-expanded="showQuickCapture" aria-haspopup="dialog" @click="showQuickCapture=!showQuickCapture">
            <PlusIcon class="h-4 w-4" aria-hidden="true" />
            <span class="hidden sm:inline">Quick capture</span>
            <span v-if="outstandingReminderCount" class="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-pill bg-brand-amber/20 type-metadata font-semibold">{{ outstandingReminderCount }}</span>
          </button>
          <button v-if="nextAppointment" type="button" class="hidden sm:inline-flex button-primary" :disabled="joiningNextSession" @click="joinNextSession">{{ joiningNextSession ? 'Opening…' : 'Join next session' }}</button>
          <router-link v-else-if="$route.path!=='/schedule'" to="/schedule" :class="['hidden sm:inline-flex items-center gap-2', hasContextualPrimary ? 'button-secondary' : 'button-primary']"><span class="leading-none font-normal">+</span>Schedule appointment</router-link>
        </div>
      </header>
      <main class="flex-1 min-h-0 bg-surface-canvas relative" :class="isFullHeightWorkspace ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'"><slot/></main>
    </div>
    <GlobalQuickCapture v-if="showQuickCapture" :reminders="openReminders" @close="showQuickCapture=false" @saved="refreshReminders" @changed="refreshReminders" />
  </div>
</template>
<script setup>
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { AcademicCapIcon,ArrowRightStartOnRectangleIcon,Bars3Icon,CalendarDaysIcon,Cog6ToothIcon,DocumentTextIcon,EllipsisHorizontalIcon,FolderOpenIcon,PlusIcon,Squares2X2Icon,UsersIcon,XMarkIcon } from '@heroicons/vue/24/outline';
import { supabase } from '../lib/supabase.js';
import { authenticatedFetch } from '../lib/authenticatedFetch.js';
import { listScheduledAppointments } from '../lib/appointments.js';
import { createOrResumeSession } from '../lib/sessions.js';
import { listTherapistReminders } from '../lib/therapistReminders.js';
import GlobalQuickCapture from '../components/reminders/GlobalQuickCapture.vue';
const route=useRoute(),router=useRouter(),isMobileMenuOpen=ref(false);const accountIdentity=ref({name:'Signed in',subtitle:'',initials:'·'});const fullHeightWorkspacePaths=new Set(['/calendar','/transcripts']);const isFullHeightWorkspace=computed(()=>fullHeightWorkspacePaths.has(route.path));const contextualPrimaryPaths=new Set(['/clients','/transcripts']);const hasContextualPrimary=computed(()=>contextualPrimaryPaths.has(route.path));
const showQuickCapture=ref(false),reminders=ref([]);const openReminders=computed(()=>reminders.value.filter(item=>!item.completedAt));const outstandingReminderCount=computed(()=>openReminders.value.length);
const now=ref(new Date()),appointments=ref([]),joiningNextSession=ref(false);let clockTimer;
const nextAppointment=computed(()=>appointments.value.find(item=>new Date(item.starts_at).getTime()>=now.value.getTime())||null);
const currentTimeLabel=computed(()=>now.value.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}));
const nextSessionTimeLabel=computed(()=>nextAppointment.value?new Date(nextAppointment.value.starts_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'');
const nextSessionCountdownLabel=computed(()=>{if(!nextAppointment.value)return'';const minutes=Math.max(0,Math.ceil((new Date(nextAppointment.value.starts_at).getTime()-now.value.getTime())/60000));if(minutes<60)return minutes===1?'1 min':`${minutes} min`;const hours=Math.floor(minutes/60),remaining=minutes%60;return remaining?`${hours}h ${remaining}m`:`${hours}h`});
async function refreshReminders(){try{reminders.value=await listTherapistReminders()}catch(error){console.warn('[AppShell] Reminders unavailable',error)}}
async function refreshAppointments(){try{appointments.value=await listScheduledAppointments()}catch(error){console.warn('[AppShell] Appointments unavailable',error)}}
async function joinNextSession(){if(!nextAppointment.value||joiningNextSession.value)return;joiningNextSession.value=true;try{const appointment=nextAppointment.value;const {session}=await createOrResumeSession(appointment.client_id);const response=await authenticatedFetch('/api/zoom/join-appointment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:appointment.client_id,appointmentId:nextAppointment.value.id})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to join the next session.');window.open(data.startUrl,'_blank','noopener,noreferrer');await router.push(`/clients/${session.clientId}/sessions/${session.id}`)}catch(error){console.error('[AppShell] Could not join next session',error)}finally{joiningNextSession.value=false}}
function initialsFor(value){const parts=String(value||'').trim().split(/\s+/).filter(Boolean);if(!parts.length)return '·';return parts.slice(0,2).map(part=>part[0]?.toUpperCase()||'').join('')||'·'}
async function loadAccountIdentity(){if(!supabase)return;try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:profile,error}=await supabase.from('profiles').select('full_name,role,professional_title').eq('id',user.id).maybeSingle();if(error)console.warn('[AppShell] Profile identity unavailable');const metadataName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';const email=user.email||'';const name=profile?.full_name?.trim()||metadataName||email||'Signed in';const professionalTitle=profile?.professional_title?.trim()||profile?.role?.trim()||'';accountIdentity.value={name,subtitle:professionalTitle||(name!==email?email:''),initials:initialsFor(name)}}catch{console.warn('[AppShell] Could not load account identity')}}
const handleReminderChange=()=>refreshReminders();onMounted(()=>{window.addEventListener('helios-reminders-changed',handleReminderChange);loadAccountIdentity();refreshReminders();refreshAppointments();clockTimer=window.setInterval(()=>{now.value=new Date()},30000)});onUnmounted(()=>{window.removeEventListener('helios-reminders-changed',handleReminderChange);window.clearInterval(clockTimer)});const handleSignOut=async()=>{if(supabase)await supabase.auth.signOut()};
const navGroups=[{label:'Practice',items:[{name:'Overview',path:'/',icon:Squares2X2Icon},{name:'Calendar',path:'/calendar',icon:CalendarDaysIcon},{name:'Clients',path:'/clients',icon:UsersIcon}]},{label:'Records',items:[{name:'Transcripts',path:'/transcripts',icon:DocumentTextIcon},{name:'Documents',path:'/documents',icon:FolderOpenIcon}]},{label:'Professional',items:[{name:'CPD',path:'/supervision',icon:AcademicCapIcon}]}];
const pageTitles={'/':'Overview','/calendar':'Calendar','/schedule':'Schedule appointment','/clients':'Clients','/transcripts':'Transcripts','/documents':'Documents','/supervision':'CPD','/settings':'Settings'};const currentPageName=computed(()=>pageTitles[route.path]||route.meta?.title||'Workspace');
const BrandLockup=defineComponent({name:'BrandLockup',setup(){return()=>h('div',{class:'flex items-center gap-2.5'},[h('div',{class:'relative h-8 w-8 rounded-pill border border-brand-amber/40 flex items-center justify-center brand-accent-surface'},[h('span',{class:'brand-mark text-lg leading-none'},'☼')]),h('div',{class:'leading-none'},[h('p',{class:'font-serif text-[1.35rem] font-semibold tracking-[-0.02em] text-ink'},'Helios'),h('p',{class:'text-[0.58rem] uppercase tracking-[0.16em] text-ink-muted mt-1'},'Practice')])])}});
const SidebarNavigation=defineComponent({name:'SidebarNavigation',props:{groups:{type:Array,required:true},currentPath:{type:String,required:true}},emits:['navigate'],setup(props,{emit}){const active=item=>item.path==='/'?props.currentPath==='/':props.currentPath===item.path||props.currentPath.startsWith(`${item.path}/`);return()=>h('nav',{class:'sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5'},props.groups.map(group=>h('section',{key:group.label},[h('p',{class:'px-3 mb-2 type-eyebrow text-ink-subtle'},group.label),h('div',{class:'space-y-1'},group.items.map(item=>h(RouterLink,{key:item.name,to:item.path,onClick:()=>emit('navigate'),class:['flex items-center gap-3 min-h-touch px-3 rounded-control type-ui transition-colors duration-standard ease-out',active(item)?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle hover:text-ink']},()=>[h(item.icon,{class:['h-[1.1rem] w-[1.1rem] shrink-0',active(item)?'text-action-primary':'text-ink-muted']}),h('span',item.name)])))])))} });
const SidebarAccount=defineComponent({name:'SidebarAccount',props:{account:{type:Object,required:true}},emits:['sign-out'],setup(props,{emit}){const open=ref(false);return()=>h('div',{class:'relative shrink-0 border-t border-border-muted px-3 py-2 bg-sidebar'},[open.value?h('div',{class:'absolute left-3 right-3 bottom-[3.35rem] rounded-panel border border-border-muted bg-surface-overlay shadow-overlay p-1.5 z-50'},[h(RouterLink,{to:'/settings',onClick:()=>{open.value=false},class:'flex items-center gap-2.5 w-full min-h-touch px-3 rounded-control type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink'},()=>[h(Cog6ToothIcon,{class:'h-4 w-4'}),h('span','Settings')]),h('button',{type:'button',onClick:()=>{open.value=false;emit('sign-out')},class:'flex items-center gap-2.5 w-full min-h-touch px-3 rounded-control type-ui text-ink-secondary hover:bg-surface-subtle hover:text-ink'},[h(ArrowRightStartOnRectangleIcon,{class:'h-4 w-4'}),h('span','Sign out')])]):null,h('button',{type:'button','aria-expanded':open.value,'aria-haspopup':'menu','aria-label':`Account menu for ${props.account.name}`,onClick:()=>{open.value=!open.value},class:'w-full min-h-touch flex items-center gap-3 px-2 rounded-control text-left hover:bg-surface-subtle transition-colors cursor-pointer'},[h('div',{class:'h-8 w-8 rounded-pill bg-action-primary flex items-center justify-center type-metadata font-semibold text-on-action shrink-0'},props.account.initials),h('div',{class:'min-w-0 flex-1 leading-tight'},[h('p',{class:'type-ui font-semibold text-ink truncate'},props.account.name)]),h(EllipsisHorizontalIcon,{class:'h-5 w-5 text-ink-muted shrink-0','aria-hidden':'true'})])])}});
</script>
<style scoped>.slide-enter-active,.slide-leave-active{transition:transform .25s ease-out}.slide-enter-from,.slide-leave-to{transform:translateX(-100%)}.fade-enter-active,.fade-leave-active{transition:opacity .2s ease-out}.fade-enter-from,.fade-leave-to{opacity:0}.sidebar-navigation{scrollbar-width:none;-ms-overflow-style:none}.sidebar-navigation::-webkit-scrollbar{display:none;width:0;height:0}</style>
