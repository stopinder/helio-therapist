<template>
  <teleport to="body">
    <div class="editor-backdrop" @mousedown.self="$emit('close')">
      <section class="editor-shell" role="dialog" aria-modal="true" aria-labelledby="resource-editor-title">
        <header class="editor-header">
          <div>
            <p class="eyebrow">Practice resource</p>
            <h2 id="resource-editor-title">{{ resource ? 'Edit resource' : 'Create resource' }}</h2>
            <p>Shape a client-facing resource, preview it as you go, then publish a new version.</p>
          </div>
          <button class="close" type="button" aria-label="Close editor" @click="$emit('close')">×</button>
        </header>

        <div class="editor-body">
          <aside class="builder-panel">
            <div class="field-group">
              <label>Title<input v-model="draft.title" /></label>
              <label>Description<textarea v-model="draft.description" rows="3" /></label>
            </div>

            <div class="block-toolbar">
              <p>Build the form</p>
              <div class="toolbar-buttons">
                <button v-for="item in blockTypes" :key="item.type" type="button" @click="addBlock(item.type)">{{ item.label }}</button>
              </div>
            </div>

            <div class="blocks">
              <article v-for="(item,index) in draft.formDefinition.items" :key="item.id" class="block-card">
                <div class="block-top">
                  <span>{{ blockLabel(item.type) }}</span>
                  <div>
                    <button type="button" :disabled="index===0" @click="move(index,-1)">↑</button>
                    <button type="button" :disabled="index===draft.formDefinition.items.length-1" @click="move(index,1)">↓</button>
                    <button type="button" class="danger" @click="remove(index)">Remove</button>
                  </div>
                </div>

                <label>Question / heading<input v-model="item.label" /></label>
                <label>Help text<input v-model="item.help" placeholder="Optional" /></label>

                <div v-if="item.type==='single_choice' || item.type==='checkboxes'" class="choices">
                  <div v-for="(choice,choiceIndex) in item.choices" :key="choiceIndex" class="choice-edit">
                    <input v-model="choice[1]" :placeholder="`Option ${choiceIndex+1}`" />
                    <button type="button" @click="item.choices.splice(choiceIndex,1)">×</button>
                  </div>
                  <button type="button" class="mini" @click="addChoice(item)">+ Add option</button>
                </div>

                <div v-if="item.type==='scale'" class="scale-grid">
                  <label>Minimum<input v-model.number="item.min" type="number" /></label>
                  <label>Maximum<input v-model.number="item.max" type="number" /></label>
                  <label>Step<input v-model.number="item.step" type="number" min="1" /></label>
                </div>

                <label class="required-row"><input v-model="item.required" type="checkbox" /> Required</label>
              </article>
            </div>

            <p v-if="error" class="error">{{ error }}</p>
          </aside>

          <section class="preview-panel">
            <div class="preview-heading">
              <div><p class="eyebrow">Client preview</p><h3>{{ draft.title || 'Untitled resource' }}</h3><p>Exactly what your client will see.</p></div>
              <span>{{ draft.formDefinition.items.length }} {{ draft.formDefinition.items.length === 1 ? 'field' : 'fields' }}</span>
            </div>
            <div class="preview-card">
              <p v-if="draft.description" class="preview-description">{{ draft.description }}</p>
              <ResourceFormRenderer v-model="previewAnswers" :definition="draft.formDefinition" />
            </div>
          </section>
        </div>

        <footer class="editor-footer">
          <span>Publishing creates a new immutable version. Previously sent copies stay unchanged.</span>
          <div>
            <button type="button" class="secondary" @click="$emit('close')">Cancel</button>
            <button type="button" class="primary" :disabled="saving || !canSave" @click="save">{{ saving ? 'Publishing…' : 'Publish version' }}</button>
          </div>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import ResourceFormRenderer from './ResourceFormRenderer.vue'
import { authenticatedFetch } from '../../lib/api.js'

const props = defineProps({ resource: { type: Object, default: null } })
const emit = defineEmits(['close','saved'])

const baseDefinition = props.resource?.version?.form_definition || { schema: 'helio-form-v1', version: 1, items: [] }
const draft = reactive({
  title: props.resource?.title || 'New practice resource',
  description: props.resource?.subtitle || '',
  formDefinition: JSON.parse(JSON.stringify(baseDefinition))
})
if (!Array.isArray(draft.formDefinition.items)) draft.formDefinition.items = []

const previewAnswers = ref({})
const saving = ref(false)
const error = ref('')
const blockTypes = [
  { type: 'short_text', label: 'Short answer' },
  { type: 'long_text', label: 'Long answer' },
  { type: 'scale', label: 'Scale' },
  { type: 'single_choice', label: 'Multiple choice' },
  { type: 'checkboxes', label: 'Checkboxes' },
]

const canSave = computed(() => draft.title.trim() && draft.formDefinition.items.length && draft.formDefinition.items.every(item => item.label?.trim()))

function newId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
}
function blockLabel(type) {
  return ({short_text:'Short answer',long_text:'Long answer',scale:'Scale',single_choice:'Multiple choice',checkboxes:'Checkboxes'})[type] || 'Field'
}
function addBlock(type) {
  const item = { id:newId(), type, label:'', help:'', required:true }
  if (type === 'scale') Object.assign(item,{min:0,max:10,step:1})
  if (type === 'single_choice' || type === 'checkboxes') item.choices = [['1','Option 1'],['2','Option 2']]
  draft.formDefinition.items.push(item)
}
function addChoice(item) {
  const value = String(item.choices.length + 1)
  item.choices.push([value,`Option ${value}`])
}
function remove(index) {
  draft.formDefinition.items.splice(index,1)
}
function move(index,delta) {
  const next = index + delta
  if (next < 0 || next >= draft.formDefinition.items.length) return
  const [item] = draft.formDefinition.items.splice(index,1)
  draft.formDefinition.items.splice(next,0,item)
}
function normaliseChoices() {
  for (const item of draft.formDefinition.items) {
    if (item.type === 'single_choice' || item.type === 'checkboxes') {
      item.choices = item.choices.map((choice,index) => [String(index+1), String(choice[1] || `Option ${index+1}`)])
    }
  }
}
async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  error.value = ''
  normaliseChoices()
  try {
    let response
    if (props.resource) {
      response = await authenticatedFetch('/api/resources', {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          resourceId:props.resource.id,
          title:draft.title,
          description:draft.description,
          completionMode:'complete_in_helio',
          formDefinition:draft.formDefinition
        })
      })
    } else {
      response = await authenticatedFetch('/api/resources', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          title:draft.title,
          description:draft.description,
          resourceKind:'worksheet',
          audience:'client',
          completionMode:'complete_in_helio',
          formDefinition:draft.formDefinition
        })
      })
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Could not publish this resource.')
    emit('saved', data.resource)
  } catch (cause) {
    error.value = cause.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.editor-backdrop{position:fixed;inset:0;z-index:100;background:rgb(27 38 33 / .42);display:flex;padding:1rem}.editor-shell{width:min(1180px,100%);height:min(92vh,940px);margin:auto;background:#f5f2e9;border:1px solid #d8e0d8;border-radius:1.35rem;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 26px 76px rgb(26 42 34 / .16)}.editor-header,.editor-footer{flex:0 0 auto;background:#fffdf8}.editor-header{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 1.5rem;border-bottom:1px solid #e0e5df}.eyebrow{margin:0 0 .25rem;color:#9a7358;font-size:.68rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.editor-header h2{margin:0;font-family:Georgia,serif;font-size:2.15rem;font-weight:400;letter-spacing:-.02em;color:#284548}.editor-header p:not(.eyebrow){margin:.35rem 0 0;color:#738078;font-size:.86rem}.close{border:0;background:transparent;font-size:1.8rem;color:#7e8882}.editor-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr)}.builder-panel,.preview-panel{overflow:auto;padding:1.35rem}.builder-panel{border-right:1px solid #dde3dd;background:#faf8f2}.field-group{display:grid;gap:.85rem;padding:1rem;border:1px solid #dfe5de;border-radius:1rem;background:#fffdf8}.field-group label,.block-card label{display:block;color:#53665f;font-size:.76rem;font-weight:700}.field-group input,.field-group textarea,.block-card input:not([type=checkbox]){box-sizing:border-box;width:100%;margin-top:.3rem;border:1px solid #d5ddd5;border-radius:.7rem;background:#fff;padding:.7rem .8rem;font:inherit;color:#294649}.block-toolbar{margin:1.1rem 0 .85rem}.block-toolbar p{margin:0 0 .5rem;font-size:.75rem;font-weight:800;color:#65766f;text-transform:uppercase;letter-spacing:.08em}.toolbar-buttons{display:flex;flex-wrap:wrap;gap:.45rem}.toolbar-buttons button,.mini{border:1px solid #cad6cc;border-radius:999px;background:#fffdf8;padding:.55rem .8rem;color:#49635b;font-size:.72rem;font-weight:700;transition:.15s}.toolbar-buttons button:hover,.mini:hover{border-color:#aebfb2;background:#eef3ee}.blocks{display:grid;gap:.75rem}.block-card{border:1px solid #dce3dc;border-radius:1rem;background:#fffdf8;padding:1rem;box-shadow:none;transition:border-color .15s}.block-card:focus-within{border-color:#afc0b3}.block-top{display:flex;justify-content:space-between;gap:.7rem;align-items:center;margin-bottom:.75rem}.block-top>span{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#8b6e4e}.block-top button{border:0;background:#eef2ed;border-radius:.45rem;padding:.35rem .5rem;color:#5b6d65}.block-top .danger{color:#9a4c45}.choices{margin-top:.6rem}.choice-edit{display:flex;gap:.4rem;margin:.4rem 0}.choice-edit button{border:0;background:transparent;color:#9a4c45;font-size:1.1rem}.scale-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.6rem}.required-row{display:flex!important;align-items:center;gap:.45rem;margin-top:.75rem}.preview-panel{background:#eef2ed}.preview-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.9rem}.preview-heading h3{margin:.15rem 0 0;font-family:Georgia,serif;font-size:1.75rem;font-weight:400;color:#284548}.preview-heading p:not(.eyebrow){margin:.25rem 0 0;color:#7e8882;font-size:.72rem}.preview-heading>span{font-size:.72rem;color:#7e8882}.preview-card{background:#fffdf8;border:1px solid #dce3db;border-radius:1.15rem;padding:1.1rem}.preview-description{margin:0 0 1rem;color:#6d7972;line-height:1.55}.editor-footer{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1rem 1.5rem;border-top:1px solid #e0e5df}.editor-footer>span{font-size:.72rem;color:#7c8781}.editor-footer div{display:flex;gap:.5rem}.secondary,.primary{border-radius:999px;padding:.7rem 1.05rem;font-weight:700}.secondary{border:1px solid #ccd7ce;background:#fff;color:#52665f}.primary{border:1px solid #31584f;background:#31584f;color:#fff}.primary:disabled{opacity:.5}.error{padding:.75rem;border-radius:.7rem;background:#f8e9e7;color:#9f3e37}@media(max-width:800px){.editor-backdrop{padding:0}.editor-shell{height:100vh;border-radius:0}.editor-body{grid-template-columns:1fr}.preview-panel{display:none}.builder-panel{border-right:0}.editor-footer{align-items:flex-start;flex-direction:column}.editor-footer div{width:100%}.editor-footer button{flex:1}}
</style>
