import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('stored transcript session is revalidated before review choices are saved', () => {
  assert.match(apiSource, /const validateSession = async/)
  assert.match(apiSource, /\.from\('sessions'\)/)
  assert.match(apiSource, /\.eq\('client_id', effectiveClientId\)/)
  assert.match(apiSource, /\.eq\('user_id', user\.id\)/)
  assert.match(apiSource, /unavailable session\. Link it to a current session before saving review choices/)
})

test('stored transcript session is revalidated before completion', () => {
  assert.match(apiSource, /markComplete === true/)
  assert.match(apiSource, /await validateSession\(effectiveSessionRef, effectiveClientId\)/)
  assert.match(apiSource, /unavailable session\. Link it to a current session before completing this transcript/)
})

test('changing client cannot fall back to the previous stored session reference', () => {
  assert.match(apiSource, /clientChanged \? null : existing\.session_ref/)
})
