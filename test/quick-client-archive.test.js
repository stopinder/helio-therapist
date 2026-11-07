import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
const clients = readFileSync(new URL('../src/lib/clients.js', import.meta.url), 'utf8')

test('normal client rows have a visible, independently clickable archive/restore action', () => {
  assert.match(view, /data-testid="quick-client-archive-action"/)
  assert.match(view, /v-else type="button" data-testid="quick-client-archive-action"/)
  assert.match(view, /:aria-label="client\.archived \? 'Restore ' \+ client\.display_name : 'Archive ' \+ client\.display_name"/)
  assert.match(view, /@click\.stop="requestQuickArchive\(client\)"/)
  assert.match(view, /@keydown\.enter\.stop @keydown\.space\.stop/)
  assert.match(view, /client\.archived\?'Restore':'Archive'/)
  assert.match(view, /tabindex="0" role="link"/)
})
test('the archive confirmation preserves records and warns about existing appointments', () => {
  assert.match(view, /window\.confirm\(/)
  assert.match(view, /all clinical records will be retained/)
  assert.match(view, /Existing appointments are not cancelled/)
  assert.doesNotMatch(view, /deleteClient\(/)
})
test('successful archive updates the list and offers an accessible Undo', () => {
  assert.match(view, /clients\.value\[index\] = \{ \.\.\.clients\.value\[index\], \.\.\.updated \}/)
  assert.match(view, /data-testid="quick-archive-notice"/)
  assert.match(view, /role="status" data-testid="quick-archive-notice"/)
  assert.match(view, /data-testid="undo-quick-archive"/)
  assert.match(view, /@click="undoQuickArchive"/)
  assert.match(view, /await saveQuickClientArchive\(client, false\)/)
  assert.match(view, /statusFilter\.value==='archived'\?c\.archived:!c\.archived/)
})
test('quick archiving only updates the signed-in therapist own client, no deletion', () => {
  assert.match(view, /setClientArchived\(\{ clientId: client\.id, archived \}\)/)
  assert.match(clients, /export async function setClientArchived/)
  assert.match(clients, /\.eq\('id', clientId\)\.eq\('user_id', user\.id\)/)
  assert.match(clients, /archived_at: archived \? now : null/)
})
test('sample client actions and archived directory filter are preserved', () => {
  assert.match(view, /v-if="isSampleClient\(client\)"/)
  assert.match(view, /Archive sample/)
  assert.match(view, /Restore sample/)
  assert.match(view, /label:'Archived'/)
})