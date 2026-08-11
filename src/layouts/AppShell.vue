<template>
  <div class="flex h-screen bg-surface-canvas text-ink overflow-hidden">
    <Transition name="slide">
      <aside v-if="isMobileMenuOpen" class="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border-muted shadow-overlay md:hidden flex flex-col">
        <div class="h-14 flex items-center justify-between px-5 border-b border-border-muted bg-surface-subtle shrink-0"><span class="font-semibold text-lg tracking-tight">Helios</span><button class="p-2 -mr-2 text-ink-subtle hover:text-ink-secondary" @click="isMobileMenuOpen=false" aria-label="Close menu"><XMarkIcon class="h-5 w-5" /></button></div>
        <SidebarNavigation :groups="navGroups" :current-path="$route.path" @navigate="isMobileMenuOpen=false" />
        <SidebarAccount :account="accountIdentity" @sign-out="handleSignOut" />
      </aside>
    </Transition>
    <Transition name="fade"><div v-if="isMobileMenuOpen" class="fixed inset-0 z-40 bg-backdrop backdrop-blur-sm md:hidden" @click="isMobileMenuOpen=false"></div></Transition>
    <aside class="hidden md:flex flex-col w-64 bg-sidebar border-r border-border-muted h-full shrink-0">
      <div class="h-14 flex items-center px-5 border-b border-border-muted font-semibold text-lg tracking-tight bg-surface-subtle shrink-0">Helios</div>
      <SidebarNavigation :groups="navGroups" :current-path="$route.path" />
      <SidebarAccount :account="accountIdentity" @sign-out="handleSignOut" />
    </aside>
    <div class="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden"><header class="h-14 flex items-center justify-between px-inline-lg border-b border-border-muted bg-surface shrink-0"><div class="flex items-center gap-inline-md"><button class="md:hidden p-2 -ml-2 text-ink-secondary hover:bg-surface-subtle rounded-control" @click="isMobileMenuOpen=true" aria-label="Open menu"><Bars3Icon class="h-5 w-5" /></button><h2 class="text-h3 font-semibold text-ink truncate">{{ currentPageName }}</h2></div><div class="flex items-center gap-inline-md"><router-link v-if="$route.path!=='/schedule'" to="/schedule" class="hidden sm:inline-flex rounded-control bg-action-primary text-on-action px-3 py-2 text-body-sm font-semibold hover:bg-action-primary-hover">Schedule appointment</router-link><div v-if="isSessionActive" class="flex items-center gap-inline-xs px-inline-md py-stack-xs rounded-pill bg-surface-subtle border border-border-muted"><span class="h-2 w-2 rounded-pill bg-state-success"></span><span class="text-caption font-medium text-ink-secondary uppercase tracking-wide">Workspace Active</span></div></div></header><main class="flex-1 min-h-0 bg-surface-canvas relative" :class="isFullHeightWorkspace ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'"><slot/></main></div>
  </div>
</template>
<script setup>
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { AcademicCapIcon,ArrowRightStartOnRectangleIcon,Bars3Icon,CalendarDaysIcon,Cog6ToothIcon,DocumentTextIcon,FolderOpenIcon,Squares2X2Icon,UsersIcon,XMarkIcon } from '@heroicons/vue/24/outline';
import { supabase } from '../lib/supabase.js';

const route=useRoute(),isMobileMenuOpen=ref(false),isSessionActive=ref(true);
const accountIdentity=ref({name:'Signed in',subtitle:'',initials:'·'});
const fullHeightWorkspacePaths=new Set(['/calendar','/transcripts']);
const isFullHeightWorkspace=computed(()=>fullHeightWorkspacePaths.has(route.path));
const handleExpiry=()=>{isSessionActive.value=false};

function initialsFor(value){
  const parts=String(value||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return '·';
  return parts.slice(0,2).map(part=>part[0]?.toUpperCase()||'').join('')||'·';
}

async function loadAccountIdentity(){
  if(!supabase)return;
  try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {data:profile,error}=await supabase.from('profiles').select('full_name,role,professional_title').eq('id',user.id).maybeSingle();
    if(error)console.warn('[AppShell] Profile identity unavailable');
    const metadataName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';
    const email=user.email||'';
    const name=profile?.full_name?.trim()||metadataName||email||'Signed in';
    const professionalTitle=profile?.professional_title?.trim()||profile?.role?.trim()||'';
    accountIdentity.value={name,subtitle:professionalTitle||(name!==email?email:''),initials:initialsFor(name)};
  }catch{
    console.warn('[AppShell] Could not load account identity');
  }
}

onMounted(()=>{window.addEventListener('helios-session-expired',handleExpiry);loadAccountIdentity()});
onUnmounted(()=>window.removeEventListener('helios-session-expired',handleExpiry));
const handleSignOut=async()=>{if(supabase)await supabase.auth.signOut()};
const navGroups=[{label:'Practice',items:[{name:'Overview',path:'/',icon:Squares2X2Icon},{name:'Calendar',path:'/calendar',icon:CalendarDaysIcon},{name:'Clients',path:'/clients',icon:UsersIcon}]},{label:'Records',items:[{name:'Transcripts',path:'/transcripts',icon:DocumentTextIcon},{name:'Documents',path:'/documents',icon:FolderOpenIcon}]},{label:'Development',items:[{name:'CPD',path:'/supervision',icon:AcademicCapIcon}]}];
const pageTitles={'/':'Overview','/calendar':'Calendar','/schedule':'Schedule appointment','/clients':'Clients','/transcripts':'Transcripts','/documents':'Documents','/supervision':'CPD','/settings':'Settings'};const currentPageName=computed(()=>pageTitles[route.path]||route.meta?.title||'Workspace');
const SidebarNavigation=defineComponent({name:'SidebarNavigation',props:{groups:{type:Array,required:true},currentPath:{type:String,required:true}},emits:['navigate'],setup(props,{emit}){const active=item=>item.path==='/'?props.currentPath==='/':props.currentPath===item.path||props.currentPath.startsWith(`${item.path}/`);return()=>h('nav',{class:'sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5'},props.groups.map(group=>h('section',{key:group.label},[h('p',{class:'px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest text-ink-subtle'},group.label),h('div',{class:'space-y-0.5'},group.items.map(item=>h(RouterLink,{key:item.name,to:item.path,onClick:()=>emit('navigate'),class:['flex items-center gap-3 px-3 py-2.5 rounded-control text-body-sm transition-colors duration-standard ease-out',active(item)?'bg-state-selected text-ink font-semibold':'text-ink-secondary hover:bg-surface-subtle hover:text-ink']},()=>[h(item.icon,{class:'h-4 w-4 shrink-0 text-ink-muted'}),h('span',item.name)])))])))} });
const SidebarAccount=defineComponent({name:'SidebarAccount',props:{account:{type:Object,required:true}},emits:['sign-out'],setup(props,{emit}){return()=>h('div',{class:'shrink-0 border-t border-border-muted px-3 py-2 bg-sidebar'},[
  h('div',{class:'flex items-center gap-2.5 px-2 py-1.5 min-w-0'},[
    h('div',{class:'h-7 w-7 rounded-pill bg-avatar flex items-center justify-center text-caption font-semibold text-ink shrink-0'},props.account.initials),
    h('div',{class:'min-w-0 leading-tight'},[
      h('p',{class:'text-caption font-semibold text-ink truncate'},props.account.name),
      props.account.subtitle?h('p',{class:'text-overline text-ink-muted truncate mt-0.5'},props.account.subtitle):null
    ])
  ]),
  h(RouterLink,{to:'/settings',class:'mt-0.5 flex items-center gap-2.5 w-full px-2 py-1.5 rounded-control text-caption font-medium text-ink-muted hover:text-ink-secondary hover:bg-surface-subtle'},()=>[h(Cog6ToothIcon,{class:'h-4 w-4'}),h('span','Settings')]),
  h('button',{type:'button',onClick:()=>emit('sign-out'),class:'flex items-center gap-2.5 w-full px-2 py-1.5 rounded-control text-caption text-ink-subtle hover:text-ink-secondary hover:bg-surface-subtle'},[h(ArrowRightStartOnRectangleIcon,{class:'h-4 w-4'}),h('span','Sign out')])
])}});
</script>
<style scoped>
.slide-enter-active,.slide-leave-active{transition:transform .25s ease-out}.slide-enter-from,.slide-leave-to{transform:translateX(-100%)}.fade-enter-active,.fade-leave-active{transition:opacity .2s ease-out}.fade-enter-from,.fade-leave-to{opacity:0}
.sidebar-navigation{scrollbar-width:thin;scrollbar-color:transparent transparent}.sidebar-navigation:hover{scrollbar-color:var(--color-border-muted,rgba(0,0,0,.16)) transparent}.sidebar-navigation::-webkit-scrollbar{width:6px}.sidebar-navigation::-webkit-scrollbar-thumb{background:transparent;border-radius:999px}.sidebar-navigation:hover::-webkit-scrollbar-thumb{background:var(--color-border-muted,rgba(0,0,0,.16))}
</style>
