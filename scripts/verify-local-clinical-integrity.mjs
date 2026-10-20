import { randomUUID, randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'

const base = process.env.HELIO_LOCAL_API
const service = process.env.HELIO_LOCAL_SERVICE
const anon = process.env.HELIO_LOCAL_ANON
assert(base?.startsWith('http://127.0.0.1:56321'), 'Local Helios API must be at isolated port 56321')
assert(service && anon, 'Isolated local credentials missing')
const results = []

async function request(method, path, key, payload = null, extraHeaders = {}) {
  const headers = { apikey: key, Authorization: 'Bearer ' + key, ...extraHeaders }
  const isRaw = typeof payload === 'string'
  if (payload != null && !isRaw) headers['Content-Type'] = 'application/json'
  const response = await fetch(base + path, {
    method, headers,
    body: payload == null ? undefined : isRaw ? payload : JSON.stringify(payload)
  })
  let text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, ok: response.ok, data }
}

function requireOk(result, label) {
  if (!result.ok) throw new Error(label + ': HTTP ' + result.status + ': ' + JSON.stringify(result.data).slice(0, 300))
  return result.data
}
function record(name, condition) {
  assert(condition, name)
  results.push(name + ': PASS')
}

const token = randomBytes(5).toString('hex')
const email = 'heliostest-' + token + '@example.invalid'
const password = 'Dev-Only-' + randomBytes(12).toString('hex')
const createdUser = requireOk(await request('POST', '/auth/v1/admin/users', service, { email, password, email_confirm: true }), 'create synthetic user')
const uid = createdUser.id || createdUser.user?.id
assert.match(uid, /^[0-9a-f-]{36}$/)
const signedIn = requireOk(await request('POST', '/auth/v1/token?grant_type=password', anon, { email, password }), 'sign in synthetic user')
const accessToken = signedIn.access_token
assert(accessToken)

async function userRequest(method, path, payload = null, extraHeaders = {}) {
  const result = await request(method, path, anon, payload, { ...extraHeaders, Authorization: 'Bearer ' + accessToken })
  return result
}

const bucket = await request('POST', '/storage/v1/bucket', service, { id: 'client-documents', name: 'client-documents', public: false })
record('Synthetic private Storage bucket available', bucket.ok || bucket.data?.code === 'BucketAlreadyExists')

const clientId = randomUUID()
requireOk(await request('POST', '/rest/v1/clients', service, { id: clientId, user_id: uid, display_name: 'Isolated Test Client' }), 'create synthetic client')
const sessionCompleted = await userRequest('POST', '/rest/v1/sessions', { user_id: uid, client_id: clientId, status: 'completed' })
record('Reject direct completed-session insert', !sessionCompleted.ok)
const forgedCompleted = await userRequest('POST', '/rest/v1/sessions', { user_id: uid, client_id: clientId, status: 'in_progress', completed_at: new Date().toISOString() })
record('Reject forged completed_at on insert', !forgedCompleted.ok)
const normalSession = await userRequest('POST', '/rest/v1/sessions', { user_id: uid, client_id: clientId, status: 'in_progress' })
record('Allow ordinary in-progress session creation', normalSession.ok)
const existing = requireOk(await userRequest('GET', '/rest/v1/sessions?client_id=eq.' + clientId + '&select=id,status,version'), 'read isolated session')
assert.equal(existing.length, 1)
const completedViaRpc = await userRequest('POST', '/rest/v1/rpc/complete_session', {
  p_session_id: existing[0].id, p_notes: 'Synthetic completed notes', p_expected_version: existing[0].version
})
record('Allow authorised session completion RPC', completedViaRpc.ok && completedViaRpc.data?.status === 'completed')

const draftFile = uid + '/tmp/draft-' + token + '.pdf'
const finalFile = uid + '/' + randomUUID() + '/final-' + token + '.pdf'
async function upload(path, content) {
  return await userRequest('POST', '/storage/v1/object/client-documents/' + path, content, { 'Content-Type': 'application/pdf' })
}
async function overwrite(path, content) {
  return await userRequest('PUT', '/storage/v1/object/client-documents/' + path, content, { 'Content-Type': 'application/pdf' })
}
async function remove(path) {
  return await userRequest('DELETE', '/storage/v1/object/client-documents', { prefixes: [path] })
}
async function read(path) {
  return await userRequest('GET', '/storage/v1/object/authenticated/client-documents/' + path)
}

const firstUpload = await upload(draftFile, 'working draft A')
if (!firstUpload.ok) console.error('STORAGE_UPLOAD_ERROR', firstUpload.status, JSON.stringify(firstUpload.data).slice(0, 320))
record('Allow owner to upload working file', firstUpload.ok)
record('Allow owner to overwrite working file', (await overwrite(draftFile, 'working draft B')).ok)
record('Allow owner to remove working file', (await remove(draftFile)).ok)
record('Allow initial approved-file upload', (await upload(finalFile, 'immutable baseline')).ok)

const docId = randomUUID()
requireOk(await request('POST', '/rest/v1/documents', service, {
  id: docId, user_id: uid, client_id: clientId,
  client_name: 'Isolated Test Client', client_ref: 'LOCAL-ONLY',
  title: 'Synthetic final record', status: 'completed',
  finalized_at: new Date().toISOString(), storage_path: finalFile
}), 'create synthetic finalised document')

const updateFinal = await overwrite(finalFile, 'tampered data')
record('Reject overwrite of finalised document Storage object', !updateFinal.ok)
const deleteFinal = await remove(finalFile)
const preserved = await read(finalFile)
record('Finalised document survives attempted Storage delete', preserved.ok && preserved.data === 'immutable baseline')
const signed = await userRequest('POST', '/storage/v1/object/sign/client-documents/' + finalFile, { expiresIn: 60 })
record('Owner can generate a finalised-document signed URL', signed.ok && Boolean(signed.data?.signedURL))
const signedPath = signed.data.signedURL
const signedLink = signedPath.startsWith('/object/') ? base + '/storage/v1' + signedPath : new URL(signedPath, base)
const signedDownload = await fetch(signedLink)
record('Signed finalised document download remains intact', signedDownload.ok && (await signedDownload.text()) === 'immutable baseline')
record('Prevent finalised-file deletion through Storage API', !deleteFinal.ok || (preserved.ok && preserved.data === 'immutable baseline'))

const resourceId = randomUUID()
requireOk(await request('POST', '/rest/v1/resource_library_items', service, {
  id: resourceId, user_id: uid, title: 'Synthetic clinical questionnaire',
  resource_kind: 'outcome_measure', content_type: 'form'
}), 'create synthetic resource')
const publish = requireOk(await request('POST', '/rest/v1/rpc/publish_resource_version', service, {
  p_user_id: uid, p_resource_id: resourceId, p_title: 'Published v1',
  p_description: 'Synthetic only', p_completion_mode: 'complete_in_helio',
  p_form_definition: {}, p_scoring_definition: {}
}), 'publish synthetic resource through existing RPC')
const versionId = publish.version?.id
assert(versionId)
const changedPublished = await userRequest('PATCH', '/rest/v1/resource_versions?id=eq.' + versionId, { client_title: 'Tampered version' })
record('Reject published-resource edit through Data API', !changedPublished.ok)
const deletedPublished = await userRequest('DELETE', '/rest/v1/resource_versions?id=eq.' + versionId)
record('Reject published-resource deletion through Data API', !deletedPublished.ok)

for(const line of results) process.stdout.write(line + '\n')
process.stdout.write('LOCAL_HELIOS_STORAGE_AND_CLINICAL_CHECKS=' + results.length + ' passed\n')
