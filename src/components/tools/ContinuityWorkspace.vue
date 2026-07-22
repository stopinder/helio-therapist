<template>
  <section class="continuity-workspace">
    <header class="workspace-heading">
      <p class="eyebrow">Longitudinal review</p>
      <h2>Continuity</h2>
      <p>Possible patterns across therapist-approved sessions.</p>
    </header>

    <template v-if="approvedSessions.length < 3">
      <div class="empty-state">
        <span aria-hidden="true">◌</span>
        <h3>Continuity begins with approved work</h3>
        <p>After three therapist-approved sessions, Helio can help surface possible patterns over time.</p>
      </div>
    </template>

    <template v-else>
      <section class="context-card">
        <p class="eyebrow">AI-supported · provisional</p>
        <h3>Observations to review</h3>
        <p>Continuity works from therapist-approved material, not raw transcripts. Nothing shown here enters the client record automatically.</p>
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

defineEmits(['open-session'])

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
.continuity-workspace{display:grid;gap:1rem}.workspace-heading{padding:.2rem 0}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);font-size:.7rem;font-weight:700;margin:0 0 .25rem}.workspace-heading h2,.context-card h3,.source-card h3{margin:0;color:var(--text-primary)}.workspace-heading p:not(.eyebrow){margin:.35rem 0 0;color:var(--text-muted)}.context-card,.source-card,.safeguard-card{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.85rem;padding:1.2rem}.context-card{background:var(--surface-muted);border-color:var(--state-selected)}.context-card p:not(.eyebrow),.safeguard-card p{color:var(--text-muted);line-height:1.55;margin:.6rem 0 0}.source-row{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;border-top:1px solid var(--border-muted);background:var(--surface-elevated);padding:.85rem .1rem;text-align:left;color:var(--text-secondary)}.source-row span:first-child{display:flex;flex-direction:column;gap:.15rem}.source-row small{color:var(--text-muted)}.safeguard-card{border-left:3px solid var(--text-subtle)}.safeguard-card strong{color:var(--text-secondary)}.empty-state{background:var(--surface-elevated);border:1px solid var(--border-muted);border-radius:.85rem;padding:3rem 1.25rem;text-align:center;color:var(--text-muted)}.empty-state span{font-size:2rem;color:var(--text-subtle)}.empty-state h3{color:var(--text-secondary);margin:.6rem 0}.empty-state p{max-width:34rem;margin:0 auto;line-height:1.55}
</style>
