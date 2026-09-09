<template>
  <div ref="root" class="cpd-reflection" :style="{ '--cpd-progress-height': `${headerHeight}px` }" @keydown.capture="cancelScroll" @wheel.passive="cancelScroll">
    <a class="skip-link" href="#quiz-main">Skip to content</a>
    <component :is="saveToLibrary ? 'section' : 'main'" id="quiz-main" class="page" :aria-busy="busy || saving">
      <div class="exercise-context no-print">
        <p>CPD <span aria-hidden="true">/</span> Practice reflection</p>
        <small>{{ saveToLibrary ? 'Private reflection · saved only when you choose' : 'Preview · not saved to your CPD history' }}</small>
      </div>

      <section v-if="stage === 'intro'" class="intro">
        <h1 ref="focusTarget" tabindex="-1">Your therapeutic stance</h1>
        <p class="lead">A reflection on how you work, at this point in your practice.</p>
        <p>Fifteen situations invite you to notice your usual starting points, possible strengths and questions to take into supervision. This is a dated CPD reflection, not a permanent therapist profile.</p>
        <div class="notice"><p>{{ DISCLAIMER }}</p><p>{{ BOUNDARY_NOTE }}</p></div>
        <p>Choose your usual first response, not everything you might eventually do. All options assume appropriate consent, safety, scope of practice and attention to the particular client. There is no professionally superior answer.</p>
        <p class="muted">For qualified and trainee therapists. The questions and interpretation rules remain a draft for review. Choices stay in page memory until you deliberately save or request AI writing. Refreshing clears unsaved work. Do not enter client information.</p>
        <label class="consent"><input v-model="acknowledged" type="checkbox" /><span>I am taking this as a reflection on my practice or training, not as an assessment of competence.</span></label>
        <button type="button" class="primary" :disabled="!acknowledged" @click="start">Begin reflection <span aria-hidden="true">→</span></button>
      </section>

      <header v-if="stage === 'quiz'" ref="stickyHeader" class="progress-header no-print" data-testid="progress-header">
        <div class="progress-row"><span>Practice reflection · 15 situations</span><span data-testid="answered-count">{{ progress.answered }} answered</span></div>
        <progress :value="progress.answered" :max="therapistQuestions.length" aria-label="Questions answered"></progress>
        <label class="scroll-preference"><input v-model="autoScroll" type="checkbox" @change="cancelScroll" /><span>Scroll to the next question after selection</span></label>
      </header>

      <section v-if="stage === 'quiz'" class="question-screen">
        <p class="muted">Click or tap an answer to move down to the next situation. With a keyboard, choose an answer and use Continue. You can turn automatic scrolling off above.</p>
        <section v-for="(question, index) in therapistQuestions" :key="question.id" :ref="el => questionRefs[index] = el" class="question-block" :data-question="question.id">
          <p class="eyebrow">Situation {{ index + 1 }} of 15 · {{ question.title }}</p>
          <fieldset :aria-describedby="`help-${question.id} feedback-${question.id}`">
            <legend tabindex="-1">{{ question.text }}</legend>
            <p :id="`help-${question.id}`" class="muted helper">Choose your usual first move, or use the final option when you cannot choose.</p>
            <label v-for="option in optionsFor(question, index)" :key="option.id" class="option" :class="{ selected: answers[question.id] === option.id }" @click="answerClicked(index, $event)">
              <input type="radio" :name="question.id" :value="option.id" :checked="answers[question.id] === option.id" @change="recordAnswer(question.id, option.id)" />
              <span>{{ option.text }}</span>
            </label>
            <label class="option context-option" :class="{ selected: answers[question.id] === CONTEXT_ANSWER }" @click="answerClicked(index, $event)">
              <input type="radio" :name="question.id" :value="CONTEXT_ANSWER" :checked="answers[question.id] === CONTEXT_ANSWER" @change="recordAnswer(question.id, CONTEXT_ANSWER)" />
              <span>{{ CONTEXT_LABEL }}<small>You can continue. This does not contribute to a tendency.</small></span>
            </label>
          </fieldset>
          <p :id="`feedback-${question.id}`" class="answer-feedback" :class="{ 'has-error': questionErrorId === question.id }" aria-live="polite">{{ questionErrorId === question.id ? 'Choose a response, or use the final option to continue.' : isAnswered(question, answers[question.id]) ? 'Response recorded.' : '' }}</p>
          <div class="actions">
            <button type="button" class="secondary" @click="index ? scrollToQuestion(index - 1) : showIntro()">{{ index ? 'Previous situation' : 'Introduction' }}</button>
            <button v-if="editing || index < therapistQuestions.length - 1" type="button" class="primary" :data-testid="`continue-${question.id}`" @click="continueFrom(index)">{{ editing ? 'Return to review' : 'Continue' }} <span aria-hidden="true">→</span></button>
          </div>
        </section>
        <div ref="reviewTarget" class="review-target" tabindex="-1">
          <p id="answer-feedback" class="completion-message" role="status">{{ progress.complete ? 'All 15 situations have a response. You can review them now.' : `${progress.missing.length} situations still need a response.` }}</p>
          <button type="button" class="primary" data-testid="continue-button" @click="goToReview">Review my choices</button>
        </div>
      </section>

      <section v-else-if="stage === 'review'">
        <h1 ref="focusTarget" tabindex="-1">Review your choices</h1>
        <p>Revisit any situation before reading your reflection. Contrasting choices are retained rather than forced into a single type.</p>
        <p class="completion-message" role="status">{{ progress.complete ? 'All 15 situations have a response. Your reflection is ready to read.' : 'Some situations still need a response.' }}</p>
        <div class="review-list">
          <div v-for="(question, index) in therapistQuestions" :key="question.id" class="review-row">
            <div><h2>{{ index + 1 }}. {{ question.title }}</h2><p>{{ selectedText(question) }}</p></div>
            <button type="button" class="text-button" :aria-label="`Change answer to ${question.title}`" :disabled="busy" @click="editQuestion(index)">Change</button>
          </div>
        </div>
        <div class="notice"><p>{{ DISCLAIMER }}</p></div>
        <section class="generation-panel" aria-labelledby="read-reflection-title">
          <h2 id="read-reflection-title">Read your reflection</h2>
          <p>The question-based reflection uses authored wording and is created in your browser. It remains available without AI.</p>
          <button type="button" class="primary" :disabled="busy || !progress.complete" @click="showQuestionBasedReport">Read reflection</button>
          <p v-if="!availabilityChecked" class="muted availability" role="status">Checking optional AI writing. You do not need to wait to read your reflection.</p>
          <p v-else-if="!canUseAI" class="muted availability">AI writing is not enabled here. The button above opens your question-based reflection.</p>
          <div v-if="canUseAI" class="ai-option">
            <h3>Optional AI-written narrative</h3>
            <p>AI develops the same structured result through an integrative reflective lens, with gentle IFS-informed language where it genuinely fits. It does not score you or compare earlier reflections.</p>
            <label class="consent"><input v-model="aiConsent" type="checkbox" :disabled="busy" /><span>I agree to send my quiz choice IDs to the report service so the deterministic result can be sent to OpenAI to write this reflection.</span></label>
            <p class="muted">No email, account details or free-text clinical material is included. The model is instructed not to infer diagnosis, trauma, attachment style, personality, competence, client outcomes or modality suitability. This request does not save the report.</p>
            <button type="button" class="secondary" :disabled="busy || !aiConsent || !progress.complete" @click="requestAIReport">{{ busy ? 'Writing your reflection…' : 'Generate AI reflection' }}</button>
          </div>
          <p v-if="busy" role="status">Your choices are preserved while the report is being written.</p>
        </section>
      </section>

      <article v-else-if="stage === 'report' && report && result" class="report">
        <h1 ref="focusTarget" tabindex="-1">A reflection on your therapeutic stance</h1>
        <p class="report-label">{{ mode === 'ai' ? 'AI-written integrative narrative from structured responses' : 'Question-based reflection · authored wording, not AI-generated' }}</p>
        <p v-if="snapshot" class="muted">Completed {{ new Date(snapshot.completedAt).toLocaleString() }}</p>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        <div class="notice boundary"><p>{{ DISCLAIMER }}</p><p>{{ BOUNDARY_NOTE }}</p></div>
        <p class="muted">This reflects choices in hypothetical situations, not an observation of practice. Possible strengths, trade-offs and client experiences are invitations to check, not findings.</p>
        <section v-for="section in report.sections" :key="section.id" class="report-section" :aria-labelledby="`section-${section.id}`">
          <h2 :id="`section-${section.id}`">{{ section.title }}</h2>
          <p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ paragraph }}</p>
        </section>
        <details class="evidence no-print">
          <summary>What this reflection is based on</summary>
          <p>Fixed, provisional editorial rules—not validated clinical measurements.</p>
          <div v-for="dimension in result.dimensions" :key="dimension.id"><h3>{{ dimension.label }}</h3><p>{{ dimension.summary }}</p></div>
          <h3>Your selected approaches</h3>
          <div v-for="item in result.evidence" :key="item.id"><h4>{{ item.scenario }}</h4><p>{{ item.selectedApproach }}</p></div>
          <p class="muted">{{ result.quizVersion }} · {{ result.reportVersion }}</p>
        </details>
        <section class="generation-panel no-print" aria-labelledby="keep-reflection-title">
          <h2 id="keep-reflection-title">Keep this reflection</h2>
          <p v-if="saveToLibrary">Save the report, selected responses and versioned interpretation to your private reflection library. It can be selected for future longitudinal reflection. Saving does not run continuity analysis, add it to supervision or make it a client record.</p>
          <p v-else class="muted">Library saving is available when this exercise is opened inside the main app. This separate preview is not connected to your account; you can still download the text.</p>
          <div class="actions">
            <button v-if="saveToLibrary" type="button" class="primary" :disabled="saving || !!savedId || !snapshot" @click="saveReflection">{{ savedId ? 'Saved to my reflection library' : saving ? 'Saving…' : 'Save to my reflection library' }}</button>
            <button type="button" class="secondary" :disabled="!snapshot" @click="downloadReport">Save reflection as text</button>
          </div>
          <p v-if="savedId" class="completion-message" role="status">Saved privately. No continuity analysis has been run.</p>
          <button v-if="savedId" type="button" class="text-button" @click="$emit('open-library', savedId)">View my reflection library</button>
          <p v-if="saveError" class="error-message" role="alert">{{ saveError }}</p>
        </section>
        <button type="button" class="text-button no-print" :disabled="saving" @click="reviewAgain">Review my choices</button>
      </article>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    </component>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { therapistQuestions, QUIZ_VERSION, CONTEXT_ANSWER, CONTEXT_LABEL } from '../quiz/therapist/questions.js'
import { DISCLAIMER, BOUNDARY_NOTE } from '../quiz/therapist/content.js'
import { buildResult, buildFallbackReport } from '../quiz/therapist/buildResult.js'
import { answerProgress, isAnswered } from '../quiz/therapist/progress.js'
import { createReflectionSnapshot, reflectionText, validReportShape, canonicalJSON } from '../quiz/therapist/snapshot.js'

const props = defineProps({
  saveToLibrary: { type: Function, default: null },
  reportEndpoint: { type: String, default: '/api/therapist-report' },
  reportAuthorization: { type: String, default: '' }
})
defineEmits(['open-library'])
const stage = ref('intro'), acknowledged = ref(false), editing = ref(false)
const answers = reactive({}), progress = computed(() => answerProgress(answers))
const autoScroll = ref(true), questionErrorId = ref(''), stickyHeader = ref(null), headerHeight = ref(115), root = ref(null)
const focusTarget = ref(null), reviewTarget = ref(null), questionRefs = []
const aiConsent = ref(false), busy = ref(false), canUseAI = ref(false), availabilityChecked = ref(false)
const errorMessage = ref(''), notice = ref(''), mode = ref('fallback'), result = ref(null), report = ref(null)
const snapshot = ref(null), saving = ref(false), savedId = ref(''), saveError = ref('')
let scrollTimer, resizeObserver, requestController, statusController, active = true
const optionsFor = (q, index) => [...q.options.slice(index % 4), ...q.options.slice(0, index % 4)]
const reportHeaders = (withJson = false) => ({
  ...(withJson ? { 'Content-Type': 'application/json' } : {}),
  ...(props.reportAuthorization ? { Authorization: props.reportAuthorization } : {})
})
function cancelScroll() { clearTimeout(scrollTimer) }
watch(stickyHeader, element => {
  resizeObserver?.disconnect()
  if (!element) return
  const measure = () => { headerHeight.value = element.getBoundingClientRect().height }
  measure()
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(element)
})
async function scrollToTarget(element, smooth = true) {
  await nextTick()
  if (!element || !active) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const heading = element.querySelector?.('legend') || element
  heading.focus?.({ preventScroll: true })
  element.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start', inline: 'nearest' })
}
async function focusHeading() { await nextTick(); return scrollToTarget(focusTarget.value, false) }
async function scrollToQuestion(index) { await nextTick(); return scrollToTarget(questionRefs[index]) }
function start() { if (acknowledged.value) { stage.value = 'quiz'; editing.value = false; scrollToQuestion(0) } }
function showIntro() { cancelScroll(); stage.value = 'intro'; focusHeading() }
function recordAnswer(id, value) {
  const q = therapistQuestions.find(q => q.id === id)
  if (!q || !isAnswered(q, value)) return
  questionErrorId.value = ''
  if (answers[id] === value) return
  answers[id] = value
  snapshot.value = null; report.value = null; result.value = null; savedId.value = ''; saveError.value = ''
}
function answerClicked(index, event) {
  if (!autoScroll.value || event.detail === 0 || editing.value) return
  cancelScroll()
  scrollTimer = setTimeout(() => {
    if (stage.value !== 'quiz' || !active || !isAnswered(therapistQuestions[index], answers[therapistQuestions[index].id])) return
    if (index < therapistQuestions.length - 1) scrollToQuestion(index + 1)
    else scrollToTarget(reviewTarget.value)
  }, 260)
}
function continueFrom(index) {
  cancelScroll()
  const q = therapistQuestions[index]
  if (!isAnswered(q, answers[q.id])) { questionErrorId.value = q.id; return }
  if (editing.value || index === therapistQuestions.length - 1) goToReview()
  else scrollToQuestion(index + 1)
}
function goToReview() {
  cancelScroll()
  if (!progress.value.complete) {
    const missing = progress.value.missing[0]
    questionErrorId.value = missing.id
    scrollToQuestion(therapistQuestions.findIndex(q => q.id === missing.id))
    return
  }
  stage.value = 'review'; editing.value = false; questionErrorId.value = ''; focusHeading()
}
function editQuestion(index) { if (!busy.value && !saving.value) { stage.value = 'quiz'; editing.value = true; scrollToQuestion(index) } }
function selectedText(q) { return answers[q.id] === CONTEXT_ANSWER ? CONTEXT_LABEL : q.options.find(o => o.id === answers[q.id])?.text || 'No answer yet.' }
function captureReport(nextReport, nextResult, nextMode) {
  const unchanged = snapshot.value && snapshot.value.narrative.mode === nextMode && canonicalJSON(snapshot.value.responses) === canonicalJSON(answers) && canonicalJSON(snapshot.value.narrative.report) === canonicalJSON(nextReport)
  if (!unchanged) {
    snapshot.value = createReflectionSnapshot({ id: crypto.randomUUID(), completedAt: new Date().toISOString(), answers: { ...answers }, report: nextReport, mode: nextMode })
    savedId.value = ''
  }
  report.value = nextReport; result.value = nextResult; mode.value = nextMode
  saveError.value = ''; stage.value = 'report'; focusHeading()
}
function showQuestionBasedReport() {
  if (busy.value || !progress.value.complete) return
  try {
    errorMessage.value = ''
    const next = buildResult({ ...answers })
    notice.value = next.sufficientForNarrative ? '' : 'There is not enough evidence for a developed narrative. No default type is assigned.'
    captureReport(buildFallbackReport(next), next, 'fallback')
  } catch { errorMessage.value = 'The reflection could not be prepared. Your choices are still here.' }
}
async function requestAIReport() {
  if (busy.value || !aiConsent.value || !canUseAI.value || !progress.value.complete) return
  busy.value = true; errorMessage.value = ''; notice.value = ''
  const selected = { ...answers }, expected = buildResult(selected)
  requestController = new AbortController()
  const timer = setTimeout(() => requestController?.abort(), 50000)
  try {
    const response = await fetch(props.reportEndpoint, {
      method: 'POST',
      headers: reportHeaders(true),
      signal: requestController.signal,
      body: JSON.stringify({ quizVersion: QUIZ_VERSION, answers: selected, consent: true })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || (response.status === 429 ? 'Please wait a minute before another AI request.' : 'AI writing is unavailable. Your choices are preserved; you can read the question-based reflection.'))
    if (!validReportShape(data.report) || data.mode !== 'ai' || canonicalJSON(data.result) !== canonicalJSON(expected)) throw new Error('The returned report could not be verified. Your choices are preserved.')
    if (!active) return
    captureReport(data.report, expected, 'ai')
  } catch (error) {
    if (active) errorMessage.value = error.name === 'AbortError' ? 'AI writing timed out. Your choices are preserved; you can read the question-based reflection.' : error.message
  } finally { clearTimeout(timer); requestController = null; if (active) busy.value = false }
}
function reviewAgain() { cancelScroll(); stage.value = 'review'; errorMessage.value = ''; notice.value = ''; focusHeading() }
async function saveReflection() {
  if (!props.saveToLibrary || !snapshot.value || saving.value || savedId.value) return
  saving.value = true; saveError.value = ''
  try {
    const saved = await props.saveToLibrary(JSON.parse(JSON.stringify(snapshot.value)))
    if (!saved?.id) throw new Error('Save was not confirmed.')
    if (active) savedId.value = saved.id
  } catch { if (active) saveError.value = 'The save was not confirmed. Your reflection is still here. Check your connection and sign-in, then retry; text download remains available.' }
  finally { if (active) saving.value = false }
}
function downloadReport() {
  if (!snapshot.value) return
  const url = URL.createObjectURL(new Blob([reflectionText(snapshot.value)], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'cpd-practice-reflection.txt'
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(async () => {
  if (!props.saveToLibrary) document.title = 'CPD · Practice reflection'
  if (!props.reportEndpoint || !props.reportAuthorization) { availabilityChecked.value = true; return }
  statusController = new AbortController()
  const timer = setTimeout(() => statusController?.abort(), 4000)
  try {
    const response = await fetch(props.reportEndpoint, { headers: reportHeaders(), signal: statusController.signal, cache: 'no-store' })
    const data = await response.json()
    if (active) canUseAI.value = response.ok && data.quizVersion === QUIZ_VERSION && data.aiAvailable === true
  } catch { if (active) canUseAI.value = false }
  finally { clearTimeout(timer); statusController = null; if (active) availabilityChecked.value = true }
})
onBeforeUnmount(() => { active = false; cancelScroll(); resizeObserver?.disconnect(); requestController?.abort(); statusController?.abort() })
</script>

<style scoped src="../quiz/therapist/reflection.css"></style>
<style scoped>
.progress-header { position: sticky; top: var(--cpd-sticky-top, 0px); z-index: 20; padding: 14px 0 12px; margin-bottom: 24px; background: var(--cpd-canvas); border-bottom: 1px solid var(--cpd-border); }
.progress-header progress { margin-bottom: 12px; }
.scroll-preference { display: flex; gap: 10px; align-items: center; color: var(--cpd-secondary); font-size: 13px; }
.scroll-preference input { accent-color: var(--cpd-teal); width: 17px; height: 17px; }
.question-block, .review-target { scroll-margin-top: calc(var(--cpd-progress-height, 130px) + var(--cpd-sticky-top, 0px) + 18px); }
.question-block { padding: 12px 0 36px; margin-bottom: 36px; border-bottom: 1px solid var(--cpd-border); }
.review-target { padding: 24px 0 12px; }
</style>
