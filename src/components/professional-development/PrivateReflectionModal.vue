<template>
  <div
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print"
    @click.self="$emit('close')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="detail-modal-title"
    data-testid="private-reflection-modal"
  >
    <div class="w-full max-w-2xl bg-surface-elevated rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-6 border-b border-border-muted flex justify-between items-start">
        <div>
          <h2 id="detail-modal-title" class="text-h2 font-semibold text-ink">Private Reflection</h2>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
              {{ formatDate(reflection.created_at) }}
            </span>
            <span v-if="reflection.theme" class="px-2 py-0.5 bg-surface-subtle text-overline font-bold text-ink-secondary uppercase rounded-full border border-border">
              {{ reflection.theme }}
            </span>
            <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded border border-state-success/20">
              Supervision Pack
            </span>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close detail view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-8 overflow-y-auto flex-1">
        <!-- AI Reflection Results -->
        <div v-if="aiResult" class="mb-8 space-y-6 animate-fade-up">
          <div class="flex items-center justify-between">
            <h3 class="text-h3 font-semibold text-ink flex items-center gap-2">
              <span class="text-state-selected">✨</span>
              Reflection Assistant
            </h3>
            <span class="text-overline font-bold text-ink-muted uppercase tracking-tighter">AI-Generated — Review Critically</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-if="aiResult.reflective_questions?.length" class="space-y-3">
              <h4 class="text-overline font-bold text-ink-secondary uppercase tracking-wider">Reflective Questions</h4>
              <ul class="space-y-2">
                <li v-for="q in aiResult.reflective_questions" :key="q" class="text-body-sm text-ink-secondary pl-4 border-l-2 border-border-muted italic">
                  "{{ q }}"
                </li>
              </ul>
            </div>

            <div v-if="aiResult.possible_themes?.length" class="space-y-3">
              <h4 class="text-overline font-bold text-ink-secondary uppercase tracking-wider">Possible Themes</h4>
              <ul class="space-y-3">
                <li v-for="t in aiResult.possible_themes" :key="t.theme" class="text-body-sm">
                  <span class="font-semibold text-ink block mb-0.5">{{ t.theme }}</span>
                  <span class="text-ink-secondary italic">{{ t.reason }}</span>
                </li>
              </ul>
            </div>

            <div v-if="aiResult.alternative_perspectives?.length" class="space-y-3">
              <h4 class="text-overline font-bold text-ink-secondary uppercase tracking-wider">Alternative Perspectives</h4>
              <ul class="space-y-2">
                <li v-for="p in aiResult.alternative_perspectives" :key="p" class="text-body-sm text-ink-secondary leading-relaxed">
                  {{ p }}
                </li>
              </ul>
            </div>

            <div v-if="aiResult.ethical_considerations?.length" class="space-y-3">
              <h4 class="text-overline font-bold text-ink-secondary uppercase tracking-wider">Ethical Considerations</h4>
              <ul class="space-y-2">
                <li v-for="e in aiResult.ethical_considerations" :key="e" class="text-body-sm text-ink-secondary leading-relaxed">
                  {{ e }}
                </li>
              </ul>
            </div>
          </div>

          <div v-if="aiResult.learning_points?.length" class="space-y-3">
            <h4 class="text-overline font-bold text-ink-secondary uppercase tracking-wider">Learning Points</h4>
            <div class="flex flex-wrap gap-3">
              <div v-for="l in aiResult.learning_points" :key="l" class="px-3 py-2 bg-surface-subtle text-body-sm text-ink-secondary rounded-panel border border-border-muted">
                {{ l }}
              </div>
            </div>
          </div>

          <div class="p-4 bg-surface-subtle border border-border-muted rounded-panel">
            <p class="text-caption text-ink-muted leading-relaxed">
              <strong>Limitations:</strong> {{ aiResult.limitations }}
            </p>
          </div>

          <div class="flex gap-3 pt-4">
            <button @click="copyAIResponse" class="flex-1 py-2 bg-surface text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all shadow-sm">
              Copy response
            </button>
            <button @click="closeAI" class="px-6 py-2 bg-surface text-ink-muted text-body-sm font-semibold border border-border rounded-control hover:text-ink transition-all">
              Close
            </button>
          </div>

          <div class="border-b-2 border-dashed border-border-muted my-8"></div>
        </div>

        <!-- Confirmation Panel -->
        <div v-if="showAIConfirmation" class="mb-8 p-6 bg-state-info-surface/30 border border-state-info/20 rounded-panel animate-fade-up">
          <h3 class="text-body font-semibold text-ink mb-2">Reflect with AI</h3>
          <p class="text-body-sm text-ink-secondary mb-6 leading-relaxed">
            Helios will send this reflection to the AI service to generate optional reflective prompts. 
            The result will not be saved automatically. Only non-identifying reflection content is sent.
          </p>
          <div class="flex gap-3">
            <button @click="startAIReflection" class="px-4 py-2 bg-state-selected text-white text-body-sm font-semibold rounded-control hover:bg-state-selected-hover transition-all shadow-sm">
              Continue
            </button>
            <button @click="showAIConfirmation = false" class="px-4 py-2 bg-surface text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all">
              Cancel
            </button>
          </div>
        </div>

        <div class="mb-6 space-y-2 bg-surface-subtle p-4 rounded-panel border border-border-muted">
          <div v-if="reflection.clients?.display_name" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">👤</span>
            <span class="font-medium">Client:</span> {{ reflection.clients.display_name }}
          </div>
          <div v-if="reflection.session_ref" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">📅</span>
            <span class="font-medium">Session:</span> 
            <button 
              @click="$emit('go-to-session', reflection)"
              class="text-state-selected hover:underline font-medium text-left"
            >
              Open session
            </button>
          </div>
        </div>

        <div class="prose prose-sm max-w-none">
          <p class="text-body text-ink italic whitespace-pre-wrap leading-relaxed">
            "{{ reflection.body || 'No content' }}"
          </p>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex justify-between items-center">
        <div v-if="error || aiError" role="alert" class="text-overline text-state-danger font-medium">
          {{ aiError || 'Could not update selection.' }}
        </div>
        <div v-else></div>

        <div class="flex items-center gap-3">
          <button
            v-if="!aiResult && !showAIConfirmation"
            @click="showAIConfirmation = true"
            :disabled="aiLoading || loading"
            class="flex items-center gap-2 px-4 py-2 bg-surface text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all disabled:opacity-50"
          >
            <span v-if="aiLoading" class="w-4 h-4 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"></span>
            <span v-else>✨</span>
            Reflect with AI
          </button>

          <div v-if="reflection.included_in_supervision" class="flex items-center gap-3">
            <span class="text-body-sm text-ink-secondary font-medium flex items-center gap-1.5">
              <span class="text-state-success">✓</span>
              Included in Supervision Pack
            </span>
            <button
              @click="$emit('toggle-supervision', reflection)"
              :disabled="loading"
              class="text-body-sm font-semibold text-state-danger hover:underline disabled:opacity-50"
            >
              Remove from Pack
            </button>
          </div>
          <button
            v-else
            @click="$emit('toggle-supervision', reflection)"
            :disabled="loading"
            class="flex items-center gap-2 px-4 py-2 bg-state-selected text-white text-body-sm font-semibold rounded-control hover:bg-state-selected-hover transition-all disabled:opacity-50 shadow-sm"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Add to Supervision Pack
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { authenticatedFetch } from '../../lib/api.js';

const props = defineProps({
  reflection: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'toggle-supervision', 'go-to-session']);

// AI Reflection State
const showAIConfirmation = ref(false);
const aiLoading = ref(false);
const aiResult = ref(null);
const aiError = ref(null);

async function startAIReflection() {
  showAIConfirmation.value = false;
  aiLoading.value = true;
  aiError.value = null;
  aiResult.value = null;

  try {
    const response = await authenticatedFetch('/api/ai/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflectionId: props.reflection.id })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'AI reflection failed');
    }

    aiResult.value = result.data;
  } catch (err) {
    console.error('[AI Reflection] Error:', err);
    aiError.value = err.message || 'AI reflection support is temporarily unavailable.';
  } finally {
    aiLoading.value = false;
  }
}

function closeAI() {
  aiResult.value = null;
  aiError.value = null;
}

function copyAIResponse() {
  if (!aiResult.value) return;
  
  const text = [
    'Reflective Questions:',
    ...aiResult.value.reflective_questions.map(q => `- ${q}`),
    '',
    'Possible Themes:',
    ...aiResult.value.possible_themes.map(t => `- ${t.theme}: ${t.reason}`),
    '',
    'Alternative Perspectives:',
    ...aiResult.value.alternative_perspectives.map(p => `- ${p}`),
    '',
    'Ethical Considerations:',
    ...aiResult.value.ethical_considerations.map(e => `- ${e}`),
    '',
    'Learning Points:',
    ...aiResult.value.learning_points.map(l => `- ${l}`),
    '',
    'Limitations:',
    aiResult.value.limitations
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    alert('AI reflection copied to clipboard');
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
</script>
