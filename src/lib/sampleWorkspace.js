import { authenticatedFetch } from './api.js'

export async function createSampleWorkspace() {
  const response = await authenticatedFetch('/api/sample-workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error?.message || 'Could not create the sample practice.')
    error.code = payload?.error?.code || 'SAMPLE_PRACTICE_FAILED'
    throw error
  }
  return payload.data
}

export function isSampleClient(client) {
  return typeof client?.reference === 'string' && client.reference.startsWith('SAMPLE-')
}
