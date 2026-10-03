export const FORM_SCHEMA = 'helio-form-v1'

export function formItems(definition) {
  return Array.isArray(definition?.items) ? definition.items : []
}

export function itemType(item) {
  if (item?.type) return item.type
  if (Array.isArray(item?.choices)) return 'single_choice'
  return 'long_text'
}

export function choiceEntries(item) {
  return Array.isArray(item?.choices) ? item.choices.map(choice => Array.isArray(choice)
    ? { value: String(choice[0]), label: String(choice[1]) }
    : { value: String(choice?.value ?? ''), label: String(choice?.label ?? choice?.value ?? '') }) : []
}

export function validateStructuredAnswers(definition, answers = {}) {
  const errors = {}
  for (const item of formItems(definition)) {
    const type = itemType(item)
    const value = answers?.[item.id]
    const required = item.required !== false

    if (type === 'single_choice') {
      const choices = choiceEntries(item)
      const validValues = new Set(choices.map(choice => choice.value))
      if (required && !validValues.has(String(value ?? ''))) errors[item.id] = 'Choose one answer.'
      else if (value != null && value !== '' && !validValues.has(String(value))) errors[item.id] = 'Choose a valid answer.'
      continue
    }

    if (type === 'scale') {
      const numeric = Number(value)
      const min = Number.isFinite(Number(item.min)) ? Number(item.min) : 0
      const max = Number.isFinite(Number(item.max)) ? Number(item.max) : 10
      if (required && (value === '' || value == null || !Number.isFinite(numeric))) errors[item.id] = 'Choose a value.'
      else if (value !== '' && value != null && (!Number.isFinite(numeric) || numeric < min || numeric > max)) errors[item.id] = 'Choose a valid value.'
      continue
    }

    if (type === 'checkboxes') {
      const selected = Array.isArray(value) ? value.map(String) : []
      const allowed = new Set(choiceEntries(item).map(choice => choice.value))
      if (required && !selected.length) errors[item.id] = 'Choose at least one answer.'
      else if (selected.some(entry => !allowed.has(entry))) errors[item.id] = 'Choose valid answers.'
      continue
    }

    const text = String(value ?? '').trim()
    if (required && !text) errors[item.id] = 'Please complete this field.'
    if (item.maxLength && text.length > Number(item.maxLength)) errors[item.id] = 'This answer is too long.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function displayAnswer(item, value) {
  const type = itemType(item)
  if (type === 'single_choice') return choiceEntries(item).find(choice => choice.value === String(value))?.label || 'Not answered'
  if (type === 'checkboxes') {
    const values = Array.isArray(value) ? value.map(String) : []
    const labels = choiceEntries(item).filter(choice => values.includes(choice.value)).map(choice => choice.label)
    return labels.length ? labels.join(', ') : 'Not answered'
  }
  if (value === '' || value == null) return 'Not answered'
  return String(value)
}

export function safetyNoticeTriggered(definition, answers = {}) {
  const rule = definition?.safety
  if (!rule?.itemId || !Array.isArray(rule?.triggerValues)) return false
  return rule.triggerValues.map(String).includes(String(answers?.[rule.itemId] ?? ''))
}
