import { normaliseInboxReturnState } from './transcriptWorkflow.js'
// Tab-memory only: a search may include names, so never put it in browser storage or URLs.
const contexts = new Map()
export function clearInboxReturnContexts() { contexts.clear() }
export function saveInboxReturnContext(value) {
  const state = normaliseInboxReturnState(value)
  if (!state) return ''
  const token = globalThis.crypto.randomUUID()
  const now = Date.now()
  for (const [key, entry] of contexts) if (entry.expires <= now) contexts.delete(key)
  while (contexts.size >= 8) contexts.delete(contexts.keys().next().value)
  contexts.set(token, { state, expires: now + 30 * 60 * 1000 })
  return token
}
export function readInboxReturnContext(token) {
  if (typeof token !== 'string') return null
  const entry = contexts.get(token)
  if (!entry) return null
  if (entry.expires <= Date.now()) { contexts.delete(token); return null }
  return { ...entry.state }
}
