<template>
  <div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full overflow-x-hidden">
    <header class="mb-8 sm:mb-10"><h1 class="text-h2 sm:text-h1 font-semibold text-ink">Settings</h1></header>

    <section class="mb-12" data-testid="settings-connections">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Connections</h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4"><span class="icon-surface icon-surface-accent !w-10 !h-10"><CalendarDays class="workspace-icon-lg" /></span><div><div class="text-body font-medium text-ink">Google Calendar</div><div class="text-body-sm" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'"><span v-if="isLoadingStatus">Checking status...</span><template v-else><span>{{ googleStatus }}</span><span v-if="googleEmail" class="block text-ink">{{ googleEmail }}</span><span v-if="googleStatus === 'Connected'" class="block text-ink-subtle text-overline">{{ lastSyncedGoogle }}</span></template></div></div></div>
          <button v-if="googleStatus !== 'Connected'" @click="connectGoogle" :disabled="isConnectingGoogle" class="min-h-touch px-4 py-2 text-body-sm font-medium text-action-link">{{ isConnectingGoogle ? 'Connecting...' : googleStatus === 'Reconnect Required' ? 'Reconnect' : 'Connect' }}</button>
          <button v-else @click="disconnectGoogle" class="min-h-touch px-3 py-2 text-body-sm text-state-danger">Disconnect</button>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
          <div class="flex items-start sm:items-center gap-4"><span class="icon-surface icon-surface-reflection !w-10 !h-10"><Video class="workspace-icon-lg" /></span><div><div class="text-body font-medium text-ink">Zoom</div><div class="text-body-sm" :class="zoomStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'"><span v-if="isLoadingZoomStatus">Checking status...</span><span v-else>{{ zoomStatus }}</span></div></div></div>
          <button v-if="zoomStatus !== 'Connected'" @click="connectZoom" :disabled="isConnectingZoom" class="min-h-touch px-4 py-2 text-body-sm font-medium text-action-link">{{ isConnectingZoom ? 'Connecting...' : 'Connect' }}</button>
          <button v-else @click="disconnectZoom" class="min-h-touch px-3 py-2 text-body-sm text-state-danger">Disconnect</button>
        </div>
      </div>
      <p class="mt-3 px-1 text-caption text-ink-subtle">Connect services once so Helios can use supported calendar, appointment and transcript workflows. Video links are chosen when scheduling or working with an appointment rather than stored as a separate default setting.</p>
    </section>

    <section class="mb-12" data-testid="settings-practice-profile">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Practice & professional details</h2>
      <form class="bg-surface-elevated border border-border-muted rounded-panel p-4 sm:p-5 space-y-6" @submit.prevent="saveProfile">
        <div>
          <p class="text-body-sm font-medium text-ink-secondary">Practice logo</p>
          <p class="mt-1 text-caption text-ink-subtle">Optional. PNG, JPEG or WebP up to 2 MB.</p>
          <div class="mt-3 flex flex-wrap items-center gap-4">
            <div class="h-16 w-28 rounded-control border border-border-muted bg-surface-subtle flex items-center justify-center overflow-hidden">
              <img v-if="logoPreviewUrl" :src="logoPreviewUrl" alt="Practice logo preview" class="max-h-full max-w-full object-contain" />
              <ImageIcon v-else class="workspace-icon-lg text-ink-muted" aria-hidden="true" />
            </div>
            <div class="flex flex-wrap gap-2">
              <label class="min-h-touch inline-flex items-center px-3 py-2 rounded-control border border-border-muted text-body-sm font-medium text-action-link cursor-pointer hover:bg-surface-subtle"><input class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadLogo" />{{ profile.practice_logo_path ? 'Replace logo' : 'Upload logo' }}</label>
              <button v-if="profile.practice_logo_path" type="button" :disabled="isUpdatingLogo" @click="removeLogo" class="min-h-touch px-3 py-2 rounded-control text-body-sm font-medium text-state-danger hover:bg-state-danger-surface">Remove logo</button>
            </div>
          </div>
          <p v-if="logoError" role="alert" class="mt-2 text-body-sm text-state-danger">{{ logoError }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="block"><span class="text-body-sm font-medium text-ink-secondary">Full name</span><input v-model.trim="profile.full_name" type="text" autocomplete="name" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block"><span class="text-body-sm font-medium text-ink-secondary">Professional title</span><input v-model.trim="profile.professional_title" type="text" placeholder="Psychotherapist" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block sm:col-span-2"><span class="text-body-sm font-medium text-ink-secondary">Practice name</span><input v-model.trim="profile.practice_name" type="text" autocomplete="organization" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block"><span class="text-body-sm font-medium text-ink-secondary">Practice email</span><input v-model.trim="profile.document_email" type="email" autocomplete="email" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block"><span class="text-body-sm font-medium text-ink-secondary">Practice phone</span><input v-model.trim="profile.document_phone" type="tel" autocomplete="tel" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block sm:col-span-2"><span class="text-body-sm font-medium text-ink-secondary">Practice website</span><input v-model.trim="profile.practice_website" type="url" autocomplete="url" placeholder="https://" class="mt-2 min-h-touch w-full rounded-control border border-border bg-surface px-3" /></label>
          <label class="block sm:col-span-2"><span class="text-body-sm font-medium text-ink-secondary">Practice address</span><textarea v-model.trim="profile.practice_address" rows="3" autocomplete="street-address" class="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2.5"></textarea></label>
        </div>
        <div class="flex flex-wrap items-center gap-3"><button type="submit" :disabled="isSavingProfile || isLoadingProfile" class="min-h-touch px-4 py-2 rounded-control bg-action-link text-on-action text-body-sm font-medium disabled:opacity-50">{{ isSavingProfile ? 'Saving…' : 'Save details' }}</button><span v-if="profileError" role="alert" class="text-body-sm text-state-danger">{{ profileError }}</span></div>
      </form>
    </section>

    <section class="mb-12"><h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Account</h2><div class="bg-surface-elevated border border-border-muted rounded-panel p-4 flex items-center justify-between gap-4"><div><div class="text-body font-medium text-ink">Therapist account</div><div class="text-body-sm text-ink-subtle">Secure Supabase session</div></div><button @click="signOut" class="px-4 py-2 text-body-sm font-medium text-state-danger">Sign out</button></div></section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { CalendarDays, Image as ImageIcon, Video } from '@lucide/vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const PROFILE_FIELDS='full_name,professional_title,practice_name,document_email,document_phone,practice_website,practice_address,practice_logo_path'
const emptyProfile=()=>({full_name:'',professional_title:'',practice_name:'',document_email:'',document_phone:'',practice_website:'',practice_address:'',practice_logo_path:null})
const profile=ref(emptyProfile()),isLoadingProfile=ref(true),isSavingProfile=ref(false),profileError=ref('')
const logoPreviewUrl=ref(''),logoError=ref(''),isUpdatingLogo=ref(false)
const googleStatus=ref('Not connected'),googleEmail=ref(''),lastSyncedGoogle=ref('Not synced yet'),isConnectingGoogle=ref(false),isLoadingStatus=ref(true)
const zoomStatus=ref('Not connected'),isConnectingZoom=ref(false),isLoadingZoomStatus=ref(true)

function formatSyncTime(value){if(!value)return'Not synced yet';const date=new Date(value),elapsed=Date.now()-date.getTime();if(elapsed>=0&&elapsed<60000)return'Synced just now';if(elapsed>=0&&elapsed<3600000)return`Last synced ${Math.floor(elapsed/60000)}m ago`;return`Last synced ${date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`}
async function currentUser(){const {data:{user},error}=await supabase.auth.getUser();if(error)throw error;if(!user)throw new Error('Please sign in again.');return user}
async function refreshLogoPreview(){logoPreviewUrl.value='';if(!profile.value.practice_logo_path)return;const {data,error}=await supabase.storage.from('practice-branding').createSignedUrl(profile.value.practice_logo_path,3600);if(!error)logoPreviewUrl.value=data?.signedUrl||''}
async function loadProfile(){isLoadingProfile.value=true;profileError.value='';try{const user=await currentUser();const {data,error}=await supabase.from('profiles').select(PROFILE_FIELDS).eq('id',user.id).maybeSingle();if(error)throw error;profile.value={...emptyProfile(),...(data||{})};await refreshLogoPreview()}catch(error){profileError.value=error.message||'Unable to load your therapist profile.'}finally{isLoadingProfile.value=false}}
async function saveProfile(){isSavingProfile.value=true;profileError.value='';try{const user=await currentUser();const {error}=await supabase.from('profiles').upsert({id:user.id,...profile.value},{onConflict:'id'});if(error)throw error}catch(error){profileError.value=error.message||'Unable to save your therapist profile.'}finally{isSavingProfile.value=false}}
async function uploadLogo(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;logoError.value='';if(!['image/png','image/jpeg','image/webp'].includes(file.type)){logoError.value='Choose a PNG, JPEG or WebP image.';return}if(file.size>2*1024*1024){logoError.value='Logo must be 2 MB or smaller.';return}isUpdatingLogo.value=true;try{const user=await currentUser();const path=`${user.id}/logo`;const {error:uploadError}=await supabase.storage.from('practice-branding').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});if(uploadError)throw uploadError;const {error:updateError}=await supabase.from('profiles').update({practice_logo_path:path}).eq('id',user.id);if(updateError)throw updateError;profile.value.practice_logo_path=path;await refreshLogoPreview()}catch(error){logoError.value=error.message||'Unable to upload the practice logo.'}finally{isUpdatingLogo.value=false}}
async function removeLogo(){if(!confirm('Remove the practice logo?'))return;logoError.value='';isUpdatingLogo.value=true;try{const user=await currentUser();const path=profile.value.practice_logo_path;if(path){const {error:removeError}=await supabase.storage.from('practice-branding').remove([path]);if(removeError)throw removeError}const {error:updateError}=await supabase.from('profiles').update({practice_logo_path:null}).eq('id',user.id);if(updateError)throw updateError;profile.value.practice_logo_path=null;logoPreviewUrl.value=''}catch(error){logoError.value=error.message||'Unable to remove the practice logo.'}finally{isUpdatingLogo.value=false}}
async function fetchGoogleStatus(){isLoadingStatus.value=true;try{const response=await authenticatedFetch('/api/google/status');if(!response.ok)return;const data=await response.json();if(data.connected){googleEmail.value=data.email||'';googleStatus.value=['GOOGLE_TOKEN_EXPIRED','GOOGLE_REVOKED','GOOGLE_TOKEN_MISSING'].includes(data.error)?'Reconnect Required':'Connected';lastSyncedGoogle.value=formatSyncTime(data.last_synced_at)}else googleStatus.value='Not connected'}finally{isLoadingStatus.value=false}}
async function fetchZoomStatus(){isLoadingZoomStatus.value=true;try{const response=await authenticatedFetch('/api/zoom/status');const data=await response.json();zoomStatus.value=response.ok&&data.connected?'Connected':'Not connected'}finally{isLoadingZoomStatus.value=false}}
async function connectGoogle(){isConnectingGoogle.value=true;const response=await authenticatedFetch('/api/google/authorize',{method:'POST'});const data=await response.json();if(response.ok&&data.url)window.location.href=data.url;else isConnectingGoogle.value=false}
async function disconnectGoogle(){if(!confirm('Disconnect Google Calendar?'))return;const response=await authenticatedFetch('/api/google/disconnect',{method:'POST'});if(response.ok){googleStatus.value='Not connected';googleEmail.value='';lastSyncedGoogle.value='Not synced yet'}}
async function connectZoom(){isConnectingZoom.value=true;const response=await authenticatedFetch('/api/zoom/authorize',{method:'POST'});const data=await response.json();if(response.ok&&data.url)window.location.href=data.url;else isConnectingZoom.value=false}
async function disconnectZoom(){if(!confirm('Disconnect Zoom? Helios will no longer retrieve future Zoom transcripts.'))return;const response=await authenticatedFetch('/api/zoom/disconnect',{method:'POST'});if(response.ok)zoomStatus.value='Not connected'}
const signOut=async()=>{await supabase.auth.signOut()}
onMounted(async()=>{await Promise.all([loadProfile(),fetchGoogleStatus(),fetchZoomStatus()])})
</script>
