<template>
  <div class="resource-form">
    <p v-if="definition?.introduction" class="form-intro">{{ definition.introduction }}</p>

    <section v-for="(item, index) in items" :key="item.id" class="field-card">
      <div class="field-heading">
        <span class="field-number">{{ index + 1 }}</span>
        <div>
          <h2>{{ item.label }}</h2>
          <p v-if="item.help">{{ item.help }}</p>
        </div>
      </div>

      <div v-if="itemType(item)==='single_choice'" class="choice-list">
        <label v-for="choice in choiceEntries(item)" :key="choice.value" class="choice-row">
          <input v-model="model[item.id]" type="radio" :name="item.id" :value="choice.value" />
          <span>{{ choice.label }}</span>
        </label>
      </div>

      <div v-else-if="itemType(item)==='scale'" class="scale-wrap">
        <div class="scale-value">{{ model[item.id] ?? '—' }}</div>
        <input
          v-model="model[item.id]"
          class="scale"
          type="range"
          :min="item.min ?? 0"
          :max="item.max ?? 10"
          :step="item.step ?? 1"
        />
        <div class="scale-labels"><span>{{ item.min ?? 0 }}</span><span>{{ item.max ?? 10 }}</span></div>
      </div>

      <div v-else-if="itemType(item)==='checkboxes'" class="choice-list">
        <label v-for="choice in choiceEntries(item)" :key="choice.value" class="choice-row">
          <input v-model="model[item.id]" type="checkbox" :value="choice.value" />
          <span>{{ choice.label }}</span>
        </label>
      </div>

      <input
        v-else-if="itemType(item)==='short_text'"
        v-model="model[item.id]"
        class="text-input"
        type="text"
        :maxlength="item.maxLength || 500"
      />

      <textarea
        v-else
        v-model="model[item.id]"
        class="text-area"
        :maxlength="item.maxLength || 4000"
        rows="5"
      />

      <p v-if="errors?.[item.id]" class="field-error">{{ errors[item.id] }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { choiceEntries, formItems, itemType } from '../../lib/resourceForms.js'

const props = defineProps({
  definition: { type: Object, required: true },
  modelValue: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

const items = computed(() => formItems(props.definition))
const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>

<style scoped>
.resource-form{display:grid;gap:1rem}.form-intro{margin:0 0 .2rem;color:#61706a;line-height:1.7;font-size:.96rem}.field-card{border:1px solid #dfe5de;border-radius:1rem;background:#fbfaf6;padding:1.1rem 1.15rem}.field-heading{display:flex;gap:.8rem;align-items:flex-start}.field-number{display:grid;place-items:center;flex:0 0 auto;width:1.7rem;height:1.7rem;border-radius:999px;background:#e4ebe4;color:#456158;font-size:.75rem;font-weight:800}.field-heading h2{margin:.05rem 0 0;font-size:1rem;line-height:1.4;color:#294649}.field-heading p{margin:.3rem 0 0;color:#758079;font-size:.82rem;line-height:1.45}.choice-list{display:grid;gap:.45rem;margin-top:.9rem}.choice-row{display:flex;align-items:center;gap:.7rem;padding:.7rem .8rem;border:1px solid #e2e6e0;border-radius:.75rem;background:#fff;cursor:pointer}.choice-row:has(input:checked){border-color:#aebfb3;background:#edf3ed}.choice-row input{accent-color:#31584f}.text-input,.text-area{box-sizing:border-box;width:100%;margin-top:.9rem;border:1px solid #d9e0d8;border-radius:.8rem;background:#fff;padding:.8rem .9rem;font:inherit;color:#294649;outline:none}.text-area{resize:vertical;min-height:7rem;line-height:1.55}.text-input:focus,.text-area:focus{border-color:#95aa9b;box-shadow:0 0 0 3px #e8eee8}.scale-wrap{margin-top:.9rem}.scale-value{font-family:Georgia,serif;font-size:1.65rem;color:#31584f}.scale{width:100%;accent-color:#31584f}.scale-labels{display:flex;justify-content:space-between;color:#8b958f;font-size:.72rem}.field-error{margin:.55rem 0 0;color:#a23b35;font-size:.78rem;font-weight:700}
</style>
