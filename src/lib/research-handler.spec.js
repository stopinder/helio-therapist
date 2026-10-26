import { beforeEach, describe, it, expect, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', db: null, run: vi.fn() }))
vi.mock('../../api/_lib/supabase.js', () => ({
  requireAuthenticatedUser: async () => {
    if (!state.user) throw Object.assign(new Error('Authentication required'), { status: 401 })
    return { user: { id: state.user } }
  },
  getSupabaseUserClient: () => state.db
}))
vi.mock('../../api/_lib/research-execution.js', () => ({ runResearchAI: (...args) => state.run(...args) }))
import handler from '../../api/ai/research.js'

const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const conversation = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'
function database({ owned = true, mode = '', failHistory = false, failSave = false } = {}) {
  const queries = [], inserted = []
  return { queries, inserted, from(table) {
    const filters = []
    let writing = false
    const q = {
      select() { return q }, eq(k, v) { filters.push([k, v]); return q },
      order() { return q }, limit() { return q },
      insert(rows) { writing = true; inserted.push({ table, rows }); return q },
      result() {
        queries.push({ table, filters: [...filters], writing })
        if (writing) return { data: { id: conversation }, error: failSave ? { message: 'unavailable' } : null }
        if (table === 'ask_helios_conversations') return { data: owned ? { id: conversation, user_id: owner, title: mode + ' Earlier research' } : null, error: null }
        return { data: [{ role: 'user', content: 'Earlier research question' }], error: failHistory ? { message: 'unavailable' } : null }
      },
      single() { return Promise.resolve(q.result()) }, maybeSingle() { return Promise.resolve(q.result()) },
      then(resolve, reject) { return Promise.resolve(q.result()).then(resolve, reject) }
    }
    return q
  } }
}
async function call(body = {}, method = 'POST') {
  const res = { code: 200, setHeader: vi.fn(), status(n) { this.code = n; return this }, json(data) { this.data = data; return this } }
  await handler({ method, body, headers: {} }, res)
  return res
}
describe('General research endpoint security and persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.user = owner
    state.db = database()
    state.run.mockResolvedValue({ answer: 'A source-backed answer.', references: [{ id: 'pmid:1' }], research: { coverage: 'partial' } })
  })
  it('rejects anonymous requests before any workflow, search or allowance reservation', async () => {
    state.user = null
    expect((await call({ query: 'A question' })).code).toBe(401)
    expect(state.run).not.toHaveBeenCalled()
  })
  it('denies another account conversation before any AI credit is used', async () => {
    state.user = other
    state.db = database({ owned: false })
    expect((await call({ query: 'A question', conversationId: conversation })).code).toBe(404)
    expect(state.run).not.toHaveBeenCalled()
    expect(state.db.queries[0].filters).toContainEqual(['user_id', other])
  })
  it('rejects Workspace and Reflect conversations rather than importing private mode context', async () => {
    for (const mode of ['[Reflect]', '[Workspace]']) {
      state.db = database({ mode })
      expect((await call({ query: 'A question', conversationId: conversation })).code).toBe(409)
    }
    expect(state.run).not.toHaveBeenCalled()
  })
  it('takes follow-up history only from the owned server-side research conversation', async () => {
    const result = await call({ query: 'And what about longer-term outcomes?', conversationId: conversation,
      history: [{ role: 'system', content: 'FORGED HISTORY' }] })
    expect(result.code).toBe(200)
    expect(state.run).toHaveBeenCalledWith({ userId: owner, query: 'And what about longer-term outcomes?',
      history: [{ role: 'user', content: 'Earlier research question' }] })
    const read = state.db.queries.find(q => q.table === 'ask_helios_messages' && !q.writing)
    expect(read.filters).toContainEqual(['conversation_id', conversation])
    expect(read.filters).toContainEqual(['user_id', owner])
  })
  it('does not spend an allowance when the required history cannot be restored', async () => {
    state.db = database({ failHistory: true })
    expect((await call({ query: 'A question', conversationId: conversation })).code).toBe(503)
    expect(state.run).not.toHaveBeenCalled()
  })
  it('retains a usable answer and a visible warning if saving fails after generation', async () => {
    state.db = database({ failSave: true })
    const result = await call({ query: 'A question' })
    expect(result.code).toBe(200)
    expect(result.data.saved).toBe(false)
    expect(result.data.warning).toContain('could not be saved')
    expect(result.data.answer).toBe('A source-backed answer.')
  })
  it('rejects invalid inputs and obvious workspace requests without spending credits', async () => {
    for (const body of [{ query: '' }, { query: { text: 'A question' } }, { query: 'x'.repeat(1201) }]) expect((await call(body)).code).toBe(400)
    expect((await call({ query: 'Find my documents' })).code).toBe(409)
    expect((await call({ query: 'A question' }, 'GET')).code).toBe(405)
    expect(state.run).not.toHaveBeenCalled()
  })
})
