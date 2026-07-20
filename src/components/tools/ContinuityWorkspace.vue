<template>
  <section class="continuity-workspace">
    <header class="workspace-heading">
      <div>
        <p class="eyebrow">Longitudinal thinking</p>
        <h2>Continuity</h2>
        <p>What appears to be happening across therapy?</p>
      </div>
      <button class="secondary" @click="$emit('back')">Back to overview</button>
    </header>

    <template v-if="approvedSessions.length < 3">
      <div class="empty-state">
        <span aria-hidden="true">◌</span>
        <h3>Continuity begins with approved work</h3>
        <p>After three therapist-approved sessions, this workspace can help you review the work over time.</p>
      </div>
    </template>

    <template v-else>
      <section class="context-card">
        <p class="eyebrow">AI-supported · provisional</p>
        <h3>Continuity review</h3>
        <p>Review only. Any future observations are drawn from therapist-approved material, not raw transcripts, and never enter the client record automatically.</p>
      </section>

      <section class="source-card">
        <div>
          <p class="eyebrow">Supporting sessions</p>
          <h3>Last three approved sessions</h3>
        </div>
        <button
          v-for="session in approvedSessions.slice(0, 3)"
          :key="session.id"
          class="source-row"
          @click="$emit('open-session', session)"
        >
          <span>
            <strong>{{ formatDate(session.startedAt) }}</strong>
            <small>{{ session.notes ? preview(session.notes) : 'Approved session record' }}</small>
          </span>
          <span>Open ›</span>
        </button>
      </section>

      <section class="safeguard-card">
        <strong>Clinical boundary</strong>
        <p>Continuity may help surface possible patterns. It does not diagnose, assess risk, recommend treatment, or replace therapist judgement.</p>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sessions: { type: Array, default: () => [] }
})

defineEmits(['back', 'open-session'])

const approvedSessions = computed(() =>
  props.sessions
    .filter(session => session.status === 'completed')
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
)

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function preview(value) {
  const text = String(value).trim().replace(/\s+/g, ' ')
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}
</script>

<style scoped>
.continuity-workspace{display:grid;gap:1rem}.workspace-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;background:#fff;border:1px solid #dbe1e8;border-radius:.9rem;padding:1.25rem}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750;margin:0 0 .25rem}.workspace-heading h2,.context-card h3,.source-card h3{margin:0;color:#2c3e50}.workspace-heading p:not(.eyebrow){margin:.35rem 0 0;color:#64748b}.secondary{border:1px solid #d7dde6;background:#fff;color:#334155;border-radius:.55rem;padding:.6rem .9rem;font-weight:650}.context-card,.source-card,.safeguard-card{background:#fff;border:1px solid #dbe1e8;border-radius:.85rem;padding:1.2rem}.context-card{background:#fbfdff;border-color:#dbeafe}.context-card p:not(.eyebrow),.safeguard-card p{color:#64748b;line-height:1.55;margin:.6rem 0 0}.source-row{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;border-top:1px solid #edf0f4;background:#fff;padding:.85rem .1rem;text-align:left;color:#334155}.source-row span:first-child{display:flex;flex-direction:column;gap:.15rem}.source-row small{color:#64748b}.safeguard-card{border-left:3px solid #94a3b8}.safeguard-card strong{color:#475569}.empty-state{background:#fff;border:1px solid #dbe1e8;border-radius:.85rem;padding:3rem 1.25rem;text-align:center;color:#64748b}.empty-state span{font-size:2rem;color:#94a3b8}.empty-state h3{color:#334155;margin:.6rem 0}.empty-state p{max-width:34rem;margin:0 auto;line-height:1.55}@media(max-width:640px){.workspace-heading{flex-direction:column}.secondary{width:100%}}
