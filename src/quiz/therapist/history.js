import { questionBank } from './questions.js'

const knownIds = new Set(questionBank.map(q => q.id))
export function mergeSeenQuestions(...histories) {
  const ids = histories.flat().filter(id => knownIds.has(id))
  // Keep the last occurrence to preserve recency while bounding stored data.
  return [...new Set(ids.toReversed())].reverse()
}
export function snapshotQuestionIds(snapshot) {
  if (snapshot?.exerciseId !== 'therapeutic-stance') return []
  return mergeSeenQuestions(Array.isArray(snapshot.questionIds) ? snapshot.questionIds : Object.keys(snapshot.responses || {}))
}
export function readSeenQuestions(storage, ownerId) {
  if (!ownerId) return []
  try {
    const value = JSON.parse(storage.getItem(`stance-seen:${ownerId}`) || '[]')
    return Array.isArray(value) ? mergeSeenQuestions(value) : []
  } catch { return [] }
}
export function writeSeenQuestions(storage, ownerId, ids) {
  if (!ownerId) return
  try { storage.setItem(`stance-seen:${ownerId}`, JSON.stringify(mergeSeenQuestions(ids))) } catch { /* In-memory avoidance remains available. */ }
}
