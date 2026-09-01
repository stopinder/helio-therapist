const CLINICAL_RECORD_FIELDS = Object.freeze([
  ['presentingConcerns', 'Presenting concerns'],
  ['sessionThemes', 'Session themes'],
  ['interventionsUsed', 'Interventions used'],
  ['clientResponse', 'Client response'],
  ['riskSafeguarding', 'Risk and safeguarding'],
  ['progressGoals', 'Progress toward goals'],
  ['planNextSession', 'Plan for next session'],
  ['legacyNotes', 'Legacy session notes']
])

export function formatClinicalRecordForDocument(notes) {
  const original = typeof notes === 'string' ? notes : ''
  if (!original.trim()) return ''

  let parsed
  try { parsed = JSON.parse(original) } catch { return original }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return original

  return CLINICAL_RECORD_FIELDS
    .map(([key, label]) => {
      const value = typeof parsed[key] === 'string' ? parsed[key].trim() : ''
      return value ? `${label}\n${value}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
