import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import transcriptsHandler from '../api/zoom/transcripts.js'
import { createClient } from '@supabase/supabase-js'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'

const THERAPIST_A = { id: 'therapist-a', email: 'a@example.com' }
const THERAPIST_B = { id: 'therapist-b', email: 'b@example.com' }

let mockDatabase = { zoom_transcripts: [] }

function resetMockDatabase() {
    mockDatabase = {
        zoom_transcripts: []
    }
}

global.fetch = async (url, options = {}) => {
    const urlString = url.toString()
    const method = options.method || 'GET'

    const getHeader = (name) => {
        if (!options.headers) return null

        if (typeof options.headers.get === 'function') {
            return options.headers.get(name)
        }

        const lowerName = name.toLowerCase()

        for (const [key, value] of Object.entries(options.headers)) {
            if (key.toLowerCase() === lowerName) return value
        }

        return null
    }

    const prefer = getHeader('Prefer') || ''
    const accept = getHeader('Accept') || ''
    const isSingle =
        prefer.toLowerCase().includes('plurality=singular') ||
        accept.toLowerCase().includes('application/vnd.pgrst.object+json')

    if (urlString.includes('/auth/v1/user')) {
        const authHeader = getHeader('Authorization') || ''

        if (authHeader.includes('token-a')) {
            return Response.json({ user: THERAPIST_A })
        }

        if (authHeader.includes('token-b')) {
            return Response.json({ user: THERAPIST_B })
        }

        return new Response(
            JSON.stringify({ error: 'Unauthenticated' }),
            { status: 401 }
        )
    }

    if (urlString.includes('/rest/v1/zoom_transcripts')) {
        const urlObj = new URL(urlString)
        const params = urlObj.searchParams

        if (method === 'GET') {
            let data = [...(mockDatabase.zoom_transcripts || [])]

            for (const [key, value] of params.entries()) {
                if (value.startsWith('eq.')) {
                    data = data.filter(
                        item => String(item[key]) === value.slice(3)
                    )
                }

                if (value === 'is.null') {
                    data = data.filter(item => item[key] == null)
                }
            }

            return isSingle
                ? Response.json(data[0] || null)
                : Response.json(data)
        }

        if (method === 'PATCH' || method === 'POST') {
            const body = await readRequestBody(options.body)

            const eq = key => {
                const value = params.get(key)
                return value?.startsWith('eq.') ? value.slice(3) : value
            }

            const id = eq('id')
            const therapistId = eq('therapist_user_id')

            let index = mockDatabase.zoom_transcripts.findIndex(item => {
                if (id && item.id !== id) return false
                if (therapistId && item.therapist_user_id !== therapistId) return false
                return true
            })

            if (index !== -1) {
                const old = mockDatabase.zoom_transcripts[index]

                if (old.deleted_at) {
                    mockDatabase.zoom_transcripts[index] = {
                        ...old,
                        ...body,

                        // Simulate database tombstone protection:
                        // deleted rows cannot be revived or repopulated.
                        deleted_at: old.deleted_at,
                        original_transcript: old.original_transcript,
                        structured_transcript: old.structured_transcript,
                        zoom_generated_summary: old.zoom_generated_summary,
                        source_title: old.source_title,
                        requested_lens: old.requested_lens
                    }
                } else {
                    mockDatabase.zoom_transcripts[index] = {
                        ...old,
                        ...body
                    }
                }

                return Response.json(mockDatabase.zoom_transcripts[index])
            }

            const newItem = {
                id: id || crypto.randomUUID(),
                ...body
            }

            mockDatabase.zoom_transcripts.push(newItem)

            return Response.json(newItem)
        }

        if (method === 'DELETE') {
            const eq = key => {
                const value = params.get(key)
                return value?.startsWith('eq.') ? value.slice(3) : value
            }

            const id = eq('id')
            const therapistId = eq('therapist_user_id')

            const initialLength = mockDatabase.zoom_transcripts.length

            mockDatabase.zoom_transcripts =
                mockDatabase.zoom_transcripts.filter(item => !(
                    item.id === id &&
                    item.therapist_user_id === therapistId
                ))

            if (mockDatabase.zoom_transcripts.length === initialLength) {
                return new Response(null, { status: 404 })
            }

            return new Response(null, { status: 204 })
        }
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
}

async function readRequestBody(body) {
    if (!body) return {}

    if (typeof body === 'string') {
        return JSON.parse(body)
    }

    const chunks = []

    for await (const chunk of body) {
        chunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        )
    }

    return JSON.parse(Buffer.concat(chunks).toString())
}

function createReq(
    token,
    method = 'DELETE',
    body = {},
    query = {}
) {
    return {
        method,
        headers: {
            authorization: `Bearer ${token}`
        },
        body,
        query,
        [Symbol.asyncIterator]: async function* () {
            if (body && typeof body === 'object') {
                yield Buffer.from(JSON.stringify(body))
            }
        }
    }
}

function createRes() {
    const res = {
        statusCode: 200,
        body: null,
        headers: {},

        status(statusCode) {
            res.statusCode = statusCode
            return res
        },

        json(payload) {
            res.body = payload
            return res
        },

        setHeader(key, value) {
            res.headers[key] = value
            return res
        },

        end(data) {
            res.body = data
            return res
        }
    }

    return res
}

test(
    'DELETE /api/zoom/transcripts: therapist can delete their completely unassigned transcript',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'unassigned',
            client_id: null,
            session_ref: null,
            review_choices_saved_at: null,
            completed_at: null,
            original_transcript: 'Sensitive transcript content',
            structured_transcript: {
                segments: [{ speaker: 'Client', text: 'Sensitive content' }]
            },
            zoom_generated_summary: 'Sensitive summary',
            source_title: 'Sensitive title',
            requested_lens: 'gentle_cbt',
            deleted_at: null
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 204)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)

        const tombstone = mockDatabase.zoom_transcripts[0]

        assert.ok(tombstone.deleted_at)
        assert.equal(tombstone.original_transcript, '')
        assert.equal(tombstone.structured_transcript, null)
        assert.equal(tombstone.zoom_generated_summary, null)
        assert.equal(tombstone.source_title, null)
        assert.equal(tombstone.requested_lens, null)
    }
)

test(
    'GET /api/zoom/transcripts: excludes tombstoned records',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [
            {
                id: 't1',
                therapist_user_id: THERAPIST_A.id,
                status: 'unassigned',
                deleted_at: null
            },
            {
                id: 't2',
                therapist_user_id: THERAPIST_A.id,
                status: 'unassigned',
                deleted_at: '2026-09-16T00:00:00Z'
            }
        ]

        const req = createReq('token-a', 'GET')
        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 200)
        assert.equal(res.body.transcripts.length, 1)
        assert.equal(res.body.transcripts[0].id, 't1')
    }
)

test(
    'mock-level tombstone protection prevents deleted transcript payload from being restored',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'unassigned',
            deleted_at: '2026-09-16T00:00:00Z',
            original_transcript: '',
            structured_transcript: null,
            zoom_generated_summary: null,
            source_title: null,
            requested_lens: null
        }]

        const client = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const {
            data,
            error
        } = await client
            .from('zoom_transcripts')
            .update({
                original_transcript: 'revived',
                structured_transcript: {
                    segments: [{ text: 'revived' }]
                },
                zoom_generated_summary: 'revived',
                source_title: 'revived',
                requested_lens: 'cbt',
                deleted_at: null
            })
            .eq('id', 't1')
            .select()
            .single()

        assert.equal(error, null)

        assert.equal(
            data.deleted_at,
            '2026-09-16T00:00:00Z'
        )

        assert.equal(
            data.original_transcript,
            ''
        )

        assert.equal(
            data.structured_transcript,
            null
        )

        assert.equal(
            data.zoom_generated_summary,
            null
        )

        assert.equal(
            data.source_title,
            null
        )

        assert.equal(
            data.requested_lens,
            null
        )
    }
)

test(
    'DELETE /api/zoom/transcripts: transcript belonging to another therapist cannot be deleted',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_B.id,
            status: 'unassigned',
            client_id: null,
            session_ref: null,
            review_choices_saved_at: null,
            completed_at: null
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 404)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)
    }
)

test(
    'DELETE /api/zoom/transcripts: assigned transcript cannot be deleted',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'ready',
            client_id: 'c1',
            session_ref: null,
            review_choices_saved_at: null,
            completed_at: null
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 403)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)
    }
)

test(
    'DELETE /api/zoom/transcripts: session-linked transcript cannot be deleted',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'ready',
            client_id: 'c1',
            session_ref: 's1',
            review_choices_saved_at: null,
            completed_at: null
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 403)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)
    }
)

test(
    'DELETE /api/zoom/transcripts: reviewed transcript cannot be deleted',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'ready',
            client_id: 'c1',
            session_ref: 's1',
            review_choices_saved_at: '2026-08-28T00:00:00Z',
            completed_at: null
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 403)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)
    }
)

test(
    'DELETE /api/zoom/transcripts: completed transcript cannot be deleted',
    async () => {
        resetMockDatabase()

        mockDatabase.zoom_transcripts = [{
            id: 't1',
            therapist_user_id: THERAPIST_A.id,
            status: 'ready',
            client_id: 'c1',
            session_ref: 's1',
            review_choices_saved_at: '2026-08-28T00:00:00Z',
            completed_at: '2026-08-28T01:00:00Z'
        }]

        const req = createReq(
            'token-a',
            'DELETE',
            { id: 't1' }
        )

        const res = createRes()

        await transcriptsHandler(req, res)

        assert.equal(res.statusCode, 403)
        assert.equal(mockDatabase.zoom_transcripts.length, 1)
    }
)