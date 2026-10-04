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

          <div class="flex flex-wrap gap-3 pt-4">
            <button @click="copyAIResponse" class="flex-1 py-2 bg-surface text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all shadow-sm">
              Copy response
            </button>
            <button 
              @click="showRephraseWorkflow = true; aiResult = null" 
              class="flex-1 py-2 bg-surface text-state-selected text-body-sm font-semibold border border-state-selected/20 rounded-control hover:bg-state-selected-surface transition-all shadow-sm"
            >
              Suggest a rephrasing
            </button>
            <button @click="closeAI" class="px-6 py-2 bg-surface text-ink-muted text-body-sm font-semibold border border-border rounded-control hover:text-ink transition-all">
              Discard
            </button>
          </div>

          <div class="border-b-2 border-dashed border-border-muted my-8"></div>
          <!-- Future persistence boundary: Saved AI-assisted material will require a separately reviewed Supabase persistence model. It must retain source reflection ID, therapist ownership, prompt version, model and provenance. It must never be written to the client timeline or clinical record automatically. -->
        </div>

        <!-- Rephrasing Workflow -->
        <div v-if="showRephraseWorkflow" class="mb-8 space-y-6 animate-fade-up">
          <div class="flex items-center justify-between">
            <h3 class="text-h3 font-semibold text-ink flex items-center gap-2">
              <span class="text-state-selected">✨</span>
              Suggest a Rephrasing
            </h3>
            <span class="text-overline font-bold text-ink-muted uppercase tracking-tighter">AI-Generated — Review Critically</span>
          </div>

          <div v-if="!aiRephraseResult" class="space-y-4">
            <p class="text-body-sm text-ink-secondary leading-relaxed">
              Select or enter a short excerpt from your reflection that you would like to rephrase. 
              Helios will suggest alternative wording. It will not change your original reflection.
            </p>
            
            <div class="space-y-2">
              <label class="text-caption font-bold text-ink-muted uppercase tracking-wider">Excerpt to rephrase</label>
              <textarea 
                v-model="selectedExcerpt"
                rows="3"
                class="w-full p-3 bg-surface border border-border rounded-panel text-body-sm text-ink focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none transition-all"
                placeholder="Paste or type an excerpt here..."
              ></textarea>
            </div>

            <div class="space-y-2">
              <label class="text-caption font-bold text-ink-muted uppercase tracking-wider">Instruction (Optional)</label>
              <input 
                v-model="rephraseInstruction"
                type="text"
                class="w-full p-3 bg-surface border border-border rounded-panel text-body-sm text-ink focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none transition-all"
                placeholder="e.g., 'Make it more professional', 'Be more concise'"
              />
            </div>

            <div v-if="rephraseError" class="text-overline text-state-danger font-medium">{{ rephraseError }}</div>

            <div class="flex gap-3">
              <button 
                @click="startRephrase"
                :disabled="rephraseLoading || !selectedExcerpt"
                class="flex-1 py-2 bg-state-selected text-white text-body-sm font-semibold rounded-control hover:bg-state-selected-hover transition-all shadow-sm disabled:opacity-50"
              >
                <span v-if="rephraseLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Get Suggestion
              </button>
              <button @click="discardRephrase" class="px-6 py-2 bg-surface text-ink-muted text-body-sm font-semibold border border-border rounded-control hover:text-ink transition-all">
                Cancel
              </button>
            </div>
          </div>

          <div v-else class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-caption font-bold text-ink-muted uppercase tracking-wider">Original Excerpt</label>
                <div class="p-4 bg-surface-subtle border border-border-muted rounded-panel text-body-sm text-ink-secondary italic leading-relaxed">
                  "{{ selectedExcerpt }}"
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-caption font-bold text-ink-muted uppercase tracking-wider">AI Suggestion</label>
                <textarea 
                  v-model="localRephrasing"
                  rows="6"
                  @input="isEditingRephrase = true"
                  class="w-full p-4 bg-white border border-state-selected/30 rounded-panel text-body-sm text-ink focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none transition-all leading-relaxed"
                ></textarea>
                <p class="text-caption text-ink-muted italic">
                  <strong>Explanation:</strong> {{ aiRephraseResult.explanation }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button @click="copyRephrase" class="flex-1 py-2 bg-surface text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all shadow-sm">
                Copy rephrasing
              </button>
              <button @click="discardRephrase" class="px-6 py-2 bg-surface text-ink-muted text-body-sm font-semibold border border-border rounded-control hover:text-ink transition-all">
                Discard
              </button>
            </div>
          </div>
          <div class="border-b-2 border-dashed border-border-muted my-8"></div>
        </div>

        <!-- Confirmation Panel -->
        <div v-if="showAIConfirmation" class="mb-8 p-6 bg-state-info-surface/30 border border-state-info/20 rounded-panel animate-fade-up">
          <h3 class="text-body font-semibold text-ink mb-2">Reflect with AI</h3>
          <p class="text-body-sm text-ink-secondary mb-6 leading-relaxed">
            Helios will send this private reflection to the AI service to generate optional reflective prompts. 
            The result will not be saved automatically and will not change your original reflection.
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
          <p 
            class="text-body text-ink italic whitespace-pre-wrap leading-relaxed cursor-text selection:bg-state-selected/20"
            @mouseup="handleTextSelection"
          >
            "{{ reflection.body || 'No content' }}"
          </p>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex flex-col gap-4">
        <section class="p-4 bg-surface-subtle border border-border-muted rounded-panel animate-fade-up" aria-labelledby="supervision-summary-heading">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h4 id="supervision-summary-heading" class="text-body-sm font-semibold text-ink">Supervision summary</h4>
              <p class="text-caption text-ink-muted mt-1">Create a private, editable summary from this reflection for use in human supervision.</p>
            </div>
            <span v-if="savedSummary && !summaryEditing" class="text-overline font-bold text-state-success uppercase tracking-wider">Saved</span>
          </div>

          <div v-if="summaryEditing" class="mt-4 space-y-3">
            <textarea
              v-model="summaryDraft"
              aria-label="Supervision summary"
              rows="7"
              class="w-full p-3 bg-surface-elevated border border-border rounded-panel text-body-sm text-ink leading-relaxed focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none"
            ></textarea>
            <p v-if="summaryError" class="text-caption text-state-danger" role="alert">{{ summaryError }}</p>
            <div class="flex flex-wrap justify-between gap-3">
              <div class="flex gap-2">
                <button type="button" class="button-secondary" :disabled="summaryGenerating" @click="generateSupervisionSummary(true)">
                  {{ summaryGenerating ? 'Preparing…' : 'Regenerate' }}
                </button>
                <button type="button" class="button-secondary" @click="cancelSummaryEditing">Cancel</button>
              </div>
              <button type="button" class="button-primary" :disabled="summarySaving || !summaryDraft.trim()" @click="saveSupervisionSummary">
                {{ summarySaving ? 'Saving…' : 'Save summary' }}
              </button>
            </div>
          </div>

          <div v-else-if="savedSummary" class="mt-4">
            <p class="text-body-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">{{ savedSummary.edited_content }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="button-secondary" @click="editSavedSummary">Edit summary</button>
              <button type="button" class="button-secondary" :disabled="summaryGenerating" @click="generateSupervisionSummary(true)">
                {{ summaryGenerating ? 'Preparing…' : 'Regenerate summary' }}
              </button>
            </div>
          </div>

          <div v-else class="mt-4">
            <p v-if="summaryError" class="text-caption text-state-danger mb-3" role="alert">{{ summaryError }}</p>
            <button
              type="button"
              class="button-secondary"
              :disabled="summaryGenerating || !canSummariseReflection"
              @click="generateSupervisionSummary(false)"
            >
              {{ summaryGenerating ? 'Preparing summary…' : 'Summarise for supervision' }}
            </button>
            <p v-if="!canSummariseReflection" class="text-caption text-state-warning mt-2">This reflection needs at least 80 characters before a useful summary can be prepared.</p>
          </div>
        </section>

        <div 
          v-if="!aiResult && !showAIConfirmation && !showRephraseWorkflow" 
          class="flex items-center justify-between p-4 bg-surface-subtle border border-border-muted rounded-panel animate-fade-up"
        >
          <div>
            <h4 class="text-body-sm font-semibold text-ink">Reflect with AI</h4>
            <p class="text-caption text-ink-muted">Generate optional questions and alternative perspectives based on this reflection.</p>
          </div>
          <button
            @click="showAIConfirmation = true"
            :disabled="aiLoading || loading"
            class="flex items-center gap-2 px-4 py-2 bg-white text-ink-secondary text-body-sm font-semibold border border-border rounded-control hover:bg-surface-subtle transition-all disabled:opacity-50 shadow-sm"
          >
            <span v-if="aiLoading" class="w-4 h-4 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"></span>
            <span v-else>✨</span>
            Reflect with AI
          </button>
        </div>

        <div class="flex justify-between items-center">
          <div v-if="error || aiError || rephraseError" role="alert" class="text-overline text-state-danger font-medium">
            {{ aiError || rephraseError || 'Could not update selection.' }}
          </div>
          <div v-else></div>

          <div class="flex items-center gap-3">
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
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { authenticatedFetch, withSessionRecovery } from '../../lib/api.js';
import { supabase } from '../../lib/supabase.js';

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
  },
  initialAIMode: {
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

// Rephrasing State
const showRephraseWorkflow = ref(false);
const rephraseLoading = ref(false);
const selectedExcerpt = ref('');
const rephraseInstruction = ref('');
const aiRephraseResult = ref(null);
const localRephrasing = ref('');
const isEditingRephrase = ref(false);
const rephraseError = ref(null);

// Supervision summary state
const savedSummary = ref(null);
const summaryDraft = ref('');
const summaryGeneratedContent = ref('');
const summaryMetadata = ref(null);
const summaryEditing = ref(false);
const summaryGenerating = ref(false);
const summarySaving = ref(false);
const summaryError = ref('');
const canSummariseReflection = computed(() => String(props.reflection?.body || '').trim().length >= 80);

async function loadSupervisionSummary() {
  if (!supabase || !props.reflection?.id) return;
  try {
    const { data, error } = await withSessionRecovery(() => supabase
      .from('reflection_supervision_summaries')
      .select('*')
      .eq('reflection_id', props.reflection.id)
      .eq('generation_status', 'saved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle());
    if (error) throw error;
    savedSummary.value = data || null;
  } catch (err) {
    console.error('[Supervision Summary] Load error:', err);
  }
}

async function generateSupervisionSummary(forceRegenerate = false) {
  if (!canSummariseReflection.value || summaryGenerating.value) return;
  summaryGenerating.value = true;
  summaryError.value = '';
  try {
    const response = await authenticatedFetch('/api/ai/supervision-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflectionId: props.reflection.id, forceRegenerate })
    });
    const result = await response.json();
    if (!response.ok || !result?.success || typeof result.summary !== 'string') {
      throw new Error(result?.error?.message || 'The summary could not be prepared.');
    }
    summaryGeneratedContent.value = result.summary;
    summaryDraft.value = result.summary;
    summaryMetadata.value = {
      model: result.model || null,
      promptVersion: result.promptVersion || null,
      modelPolicyVersion: result.modelPolicyVersion || null
    };
    summaryEditing.value = true;
  } catch (err) {
    console.error('[Supervision Summary] Generate error:', err);
    summaryError.value = err.message || 'The summary could not be prepared. Your reflection was not changed.';
  } finally {
    summaryGenerating.value = false;
  }
}

function editSavedSummary() {
  summaryDraft.value = savedSummary.value?.edited_content || '';
  summaryGeneratedContent.value = savedSummary.value?.generated_content || summaryDraft.value;
  summaryMetadata.value = {
    model: savedSummary.value?.model || null,
    promptVersion: savedSummary.value?.prompt_version || null
  };
  summaryError.value = '';
  summaryEditing.value = true;
}

function cancelSummaryEditing() {
  summaryEditing.value = false;
  summaryDraft.value = '';
  summaryGeneratedContent.value = '';
  summaryMetadata.value = null;
  summaryError.value = '';
}

async function saveSupervisionSummary() {
  if (!supabase || !props.reflection?.id || summarySaving.value || !summaryDraft.value.trim()) return;
  summarySaving.value = true;
  summaryError.value = '';
  try {
    const { data, error } = await withSessionRecovery(() => supabase.rpc('save_reflection_supervision_summary', {
      p_reflection_id: props.reflection.id,
      p_generated_content: summaryGeneratedContent.value || summaryDraft.value.trim(),
      p_edited_content: summaryDraft.value.trim(),
      p_model: summaryMetadata.value?.model || null,
      p_prompt_version: summaryMetadata.value?.promptVersion || null,
      p_generated_at: new Date().toISOString()
    }));
    const saved = Array.isArray(data) ? data[0] : data;
    if (error || !saved) throw error || new Error('The summary could not be saved.');
    savedSummary.value = saved;
    summaryEditing.value = false;
    summaryDraft.value = '';
    summaryGeneratedContent.value = '';
    summaryMetadata.value = null;
  } catch (err) {
    console.error('[Supervision Summary] Save error:', err);
    summaryError.value = 'The draft is still open, but could not be saved. Please try again.';
  } finally {
    summarySaving.value = false;
  }
}

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
    aiError.value = 'AI reflection support is temporarily unavailable. Your reflection has not been changed.';
  } finally {
    aiLoading.value = false;
  }
}

async function startRephrase() {
  if (!selectedExcerpt.value) return;
  
  rephraseLoading.value = true;
  rephraseError.value = null;
  
  try {
    const response = await authenticatedFetch('/api/ai/rephrase-reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reflectionId: props.reflection.id,
        excerpt: selectedExcerpt.value,
        instruction: rephraseInstruction.value
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Rephrasing failed');
    }

    aiRephraseResult.value = result.data;
    localRephrasing.value = result.data.rephrased_text;
    isEditingRephrase.value = false;
  } catch (err) {
    console.error('[AI Rephrase] Error:', err);
    rephraseError.value = 'AI reflection support is temporarily unavailable. Your reflection has not been changed.';
  } finally {
    rephraseLoading.value = false;
  }
}

function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  if (text && props.reflection.body.includes(text)) {
    selectedExcerpt.value = text;
  }
}

function closeAI() {
  aiResult.value = null;
  aiError.value = null;
}

function discardRephrase() {
  if (isEditingRephrase.value && localRephrasing.value !== aiRephraseResult.value?.rephrased_text) {
    if (!confirm('Discard your changes to the suggested rephrasing?')) return;
  }
  
  showRephraseWorkflow.value = false;
  aiRephraseResult.value = null;
  localRephrasing.value = '';
  selectedExcerpt.value = '';
  rephraseInstruction.value = '';
  rephraseError.value = null;
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
    aiResult.value.limitations,
    '',
    'AI-generated reflection support — review critically.'
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => {
    alert('AI reflection copied to clipboard');
  });
}

function copyRephrase() {
  navigator.clipboard.writeText(localRephrasing.value).then(() => {
    alert('Rephrased text copied to clipboard');
  });
}

onMounted(() => {
  loadSupervisionSummary();
  if (props.initialAIMode) {
    showAIConfirmation.value = true;
  }
});

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
