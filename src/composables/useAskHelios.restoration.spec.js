import { beforeEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ user: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', listeners: [], db: null, failRead: false }))
vi.mock('../lib/supabase.js', () => ({ supabase: { auth: {
  onAuthStateChange(callback) { env.listeners.push(callback); return { data: { subscription: { unsubscribe() {} } } } },
  async getSession() { return { data: { session: env.user ? { user: { id: env.user } } : null }, error: null } }
} } }))
vi.mock('../lib/api.js', () => ({ authenticatedFetch: vi.fn() }))
vi.mock('../../api/_lib/supabase.js', () => ({
  async requireAuthenticatedUser() {
    if (!env.user) throw Object.assign(new Error('Authentication required'), { status: 401 })
    return { user: { id: env.user } }
  },
  getSupabaseUserClient() { return env.db }
}))
vi.mock('../../api/_lib/ai-execution.js', () => ({
  AI_FEATURES: { ASK_HELIOS_RESEARCH: 'ask_helios.research' },
  runTextAI: vi.fn(() => { throw new Error('Document discovery must not invoke OpenAI') })
}))

// Stateful fixture: real handlers, real context replay and document pagination.
// The only substitutes are authentication, storage and HTTP transport.
function database() {
  let seq = 0
  const tables = { ask_helios_conversations: [], ask_helios_messages: [], documents: [], clients: [] }
  const owner = env.user
  for (let i = 0; i < 40; i++) tables.documents.push({
    id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'), user_id: owner,
    title: 'Consent form ' + i, document_type: 'consent_form', status: 'draft',
    updated_at: new Date(Date.UTC(2026, 9, 25) - i * 1000).toISOString(), archived_at: null
  })
  const db = { tables, from(table) {
    let filters = [], orders = [], limit = Infinity, range = null, inserted = null, applied = false
    const q = {
      select() { return q }, eq(k, v) { filters.push(row => row[k] === v); return q },
      neq(k, v) { filters.push(row => row[k] !== v); return q },
      is(k, v) { filters.push(row => row[k] === v); return q },
      in(k, values) { filters.push(row => values.includes(row[k])); return q },
      order(k, opts = {}) { orders.push([k, opts.ascending !== false]); return q },
      limit(n) { limit = n; return q }, range(a, b) { range = [a, b]; return q },
      or(expr) { const term = expr.split('%')[1]; filters.push(r => [r.title, r.document_type, r.original_filename].some(v => String(v || '').includes(term))); return q },
      insert(value) { inserted = Array.isArray(value) ? value : [value]; return q },
      result() {
        if (inserted && !applied) {
          applied = true
          inserted = inserted.map(row => ({ ...row, id: row.id || '10000000-0000-4000-8000-' + String(++seq).padStart(12, '0'),
            created_at: new Date(Date.UTC(2026, 9, 25, 12, 0, 0) + seq * 1000).toISOString() }))
          tables[table].push(...inserted)
        }
        let rows = (inserted || tables[table] || []).filter(row => row.user_id === env.user && filters.every(fn => fn(row)))
        for (const [key, ascending] of [...orders].reverse()) rows = rows.sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')) * (ascending ? 1 : -1))
        const count = rows.length
        rows = rows.slice(0, limit)
        if (range) rows = rows.slice(range[0], range[1] + 1)
        return { data: rows, error: null, count }
      },
      single() { const r = q.result(); return Promise.resolve({ ...r, data: r.data[0] || null, error: r.data.length ? null : { message: 'Not found' } }) },
      maybeSingle() { const r = q.result(); return Promise.resolve({ ...r, data: r.data[0] || null }) },
      then(resolve, reject) { return Promise.resolve(q.result()).then(resolve, reject) }
    }
    return q
  } }
  return db
}

async function boot() {
  const api = await import('../lib/api.js')
  const assist = (await import('../../api/ai/assist.js')).default
  const conversations = (await import('../../api/ai/conversations.js')).default
  api.authenticatedFetch.mockImplementation(async (url, options = {}) => {
    if (url === '/api/ai/workspace-clients') return { ok: true, json: async () => ({ success: true, clients: [] }) }
    if (env.failRead && url.startsWith('/api/ai/conversations?id=')) throw new Error('Network unavailable')
    let result, status = 200
    const response = { setHeader() {}, status(n) { status = n; return response }, json(value) { result = value; return value } }
    const request = { method: options.method || 'GET', query: Object.fromEntries(new URL(url, 'https://fixture.local').searchParams), body: options.body ? JSON.parse(options.body) : {} }
    await (url.startsWith('/api/ai/conversations') ? conversations : assist)(request, response)
    return { ok: status >= 200 && status < 300, status, json: async () => result }
  })
  return { ask: (await import('./useAskHelios.js')).useAskHelios(), api }
}

async function send(ask, api, query) {
  if (ask.ensureConversationReady) expect(await ask.ensureConversationReady()).toBe(true)
  const response = await api.authenticatedFetch('/api/ai/assist', { method: 'POST', body: JSON.stringify({
    mode: 'workspace', query, conversationId: ask.activeConversationId.value
  }) })
  const data = await response.json()
  expect(response.ok, JSON.stringify(data)).toBe(true)
  ask.assignConversationId(data.conversationId)
  ask.addMessage({ role: 'user', content: query })
  ask.addMessage({ role: 'assistant', content: data.answer, documentSearch: data.documentSearch })
  return data
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear()
  env.user = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'; env.listeners = []; env.failRead = false; env.db = database()
})

describe('Ask Helios real pagination across browser-state reset', () => {
  it('continues 1-8, 9-16, refresh, then 17-24 using the same saved conversation', async () => {
    let { ask, api } = await boot()
    ask.setMode('workspace')
    expect((await send(ask, api, 'Find my documents')).answer).toContain('Showing 1–8 of 40')
    expect((await send(ask, api, 'Show more documents.')).answer).toContain('Showing 9–16 of 40')
    const id = ask.activeConversationId.value
    // New JS module state is the relevant effect of a full browser reload.
    vi.resetModules(); env.listeners = []
    ;({ ask, api } = await boot())
    await ask.openPanel()
    expect(ask.activeConversationId.value).toBe(id)
    expect((await send(ask, api, 'Show more documents.')).answer).toContain('Showing 17–24 of 40')
    expect(env.db.tables.ask_helios_conversations).toHaveLength(1)
  })

  it('retains consent and draft filters through refresh and reopening from history', async () => {
    let { ask, api } = await boot()
    await send(ask, api, 'Find my documents')
    await send(ask, api, 'Show only consent forms')
    await send(ask, api, 'Show only drafts')
    await send(ask, api, 'Show more documents')
    const id = ask.activeConversationId.value
    vi.resetModules(); env.listeners = []
    ;({ ask, api } = await boot())
    await ask.selectConversation(id)
    const result = await send(ask, api, 'Show more documents')
    expect(result.documentSearch).toMatchObject({ type: 'consent', status: 'draft', page: 2 })
    expect(result.answer).toContain('Showing 17–24 of 40')
  })

  it('blocks submission when restoration fails instead of opening a fresh conversation', async () => {
    let { ask, api } = await boot()
    await send(ask, api, 'Find my documents')
    vi.resetModules(); env.listeners = []; env.failRead = true
    ;({ ask, api } = await boot())
    await ask.openPanel()
    expect(await ask.ensureConversationReady()).toBe(false)
    expect(ask.restoreError.value).toBeTruthy()
    expect(env.db.tables.ask_helios_conversations).toHaveLength(1)
    env.failRead = false
    expect(await ask.retryRestore()).toBe(true)
    expect((await send(ask, api, 'Show more documents')).answer).toContain('Showing 9–16 of 40')
  })

  it('never restores another account pointer after an account change', async () => {
    let { ask, api } = await boot()
    await send(ask, api, 'Find my documents')
    env.user = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
    vi.resetModules(); env.listeners = []
    ;({ ask, api } = await boot())
    await ask.openPanel()
    expect(ask.activeConversationId.value).toBeNull()
    expect(ask.messages.value).toHaveLength(0)
    expect(api.authenticatedFetch.mock.calls.some(([url]) => url.includes('/conversations?id='))).toBe(false)
  })

  it('does not silently start page one when a continuation arrives without a saved search', async () => {
    const { api } = await boot()
    const response = await api.authenticatedFetch('/api/ai/assist', { method: 'POST', body: JSON.stringify({
      mode: 'workspace', query: 'Show more documents.', conversationId: null
    }) })
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('DOCUMENT_CONTEXT_REQUIRED')
    expect(env.db.tables.ask_helios_conversations).toHaveLength(0)
    expect(env.db.tables.ask_helios_messages).toHaveLength(0)
  })

  it('New chat removes the pointer so a reload does not resurrect the old task', async () => {
    let { ask, api } = await boot()
    await send(ask, api, 'Find my documents')
    ask.clearConversation()
    vi.resetModules(); env.listeners = []
    ;({ ask, api } = await boot())
    await ask.openPanel()
    expect(ask.activeConversationId.value).toBeNull()
    expect(ask.messages.value).toHaveLength(0)
  })

  it('discards a late history response if the account signs out during restoration', async () => {
    const { ask, api } = await boot()
    await send(ask, api, 'Find my documents')
    const id = ask.activeConversationId.value
    let complete
    api.authenticatedFetch.mockImplementation(url => url.includes('/conversations?id=')
      ? new Promise(resolve => { complete = resolve })
      : Promise.resolve({ ok: true, json: async () => ({ success: true, clients: [], conversations: [] }) }))
    const pending = ask.selectConversation(id)
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    env.user = null
    env.listeners.at(-1)('SIGNED_OUT', null)
    complete({ ok: true, json: async () => ({ success: true, conversation: { id, title: '[Workspace] Find my documents' }, messages: [{ role: 'assistant', content: 'private prior account text' }] }) })
    expect(await pending).toBe(false)
    expect(ask.activeConversationId.value).toBeNull()
    expect(ask.messages.value).toHaveLength(0)
  })

  it('restores clinical client scope from owned conversation metadata and keeps it out of visible references', async () => {
    const { ask } = await boot()
    const id = '20000000-0000-4000-8000-000000000001'
    env.db.tables.ask_helios_conversations.push({
      id, user_id: env.user, title: '[Workspace] What might I be missing?', updated_at: '2026-10-31T10:00:00Z'
    })
    env.db.tables.ask_helios_messages.push(
      { id:'m1', conversation_id:id, user_id:env.user, role:'user', content:'What might I be missing?', created_at:'2026-10-31T10:00:01Z' },
      { id:'m2', conversation_id:id, user_id:env.user, role:'assistant', content:'Recorded context...', created_at:'2026-10-31T10:00:02Z',
        citation_metadata:[
          { title:'30 Oct session', url:'/clients/cccccccc-cccc-4ccc-cccc-cccccccccccc/sessions/eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', citation:'linked transcript' },
          { kind:'ask_helios_clinical_context', clientId:'cccccccc-cccc-4ccc-cccc-cccccccccccc', clientName:'Client A',
            anchorSessionId:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', window:'last_five', lens:'internal_family_systems', sourceCount:5 }
        ] }
    )
    expect(await ask.selectConversation(id)).toBe(true)
    expect(ask.mode.value).toBe('workspace')
    expect(ask.clinicalContext.value).toMatchObject({
      clientId:'cccccccc-cccc-4ccc-cccc-cccccccccccc',
      anchorSessionId:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
      window:'last_five', lens:'internal_family_systems', sourceCount:5
    })
    expect(ask.selectedClientId.value).toBe('cccccccc-cccc-4ccc-cccc-cccccccccccc')
    expect(ask.messages.value.at(-1).references).toEqual([
      { title:'30 Oct session', url:'/clients/cccccccc-cccc-4ccc-cccc-cccccccccccc/sessions/eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', citation:'linked transcript' }
    ])
    ask.clearConversation()
    expect(ask.clinicalContext.value?.window).toBe('last_five')
    ask.setMode('research')
    expect(ask.clinicalContext.value).toBeNull()
  })

  it('stores only the opaque conversation pointer, never messages or filters, in session storage', async () => {
    const { ask, api } = await boot()
    await send(ask, api, 'Find my consent forms')
    const stored = Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join(' ')
    expect(stored).toContain(ask.activeConversationId.value)
    expect(stored).not.toContain('Consent form')
    expect(stored).not.toContain('documents')
    expect(stored).not.toContain('draft')
  })
})
