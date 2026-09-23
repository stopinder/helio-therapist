import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('API handles batch clear attention with ownership restriction', () => {
  assert.match(apiSource, /action === 'clear-attention'/)
  assert.match(apiSource, /\.update\(\{/)
  assert.match(apiSource, /attention_cleared_at: new Date\(\)\.toISOString\(\)/)
  assert.match(apiSource, /\.in\('id', ids\)/)
  assert.match(apiSource, /\.eq\('therapist_user_id', user\.id\)/)
  assert.match(apiSource, /\.is\('completed_at', null\)/)
  assert.match(apiSource, /\.is\('deleted_at', null\)/)
})

test('API handles individual restoration to attention with ownership restriction', () => {
  assert.match(apiSource, /restoreAttention === true/)
  assert.match(apiSource, /update\.attention_cleared_at = null/)
  // The general update uses .eq('therapist_user_id', user.id)
  assert.match(apiSource, /\.eq\('id', id\)\.eq\('therapist_user_id', user\.id\)\.eq\('updated_at', expectedUpdatedAt\)/)
})
