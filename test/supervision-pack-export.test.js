import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Supervision Pack View and Export Flow', async () => {
  const content = await readFile(new URL('../src/views/Supervision.vue', import.meta.url), 'utf8')

  // 1. Third view added: Timeline, Insights, Pack
  assert.match(content, /activeView === 'pack'/)
  assert.match(content, /<button\s+@click="activeView = 'pack'"/)
  assert.match(content, /Pack/)

  // 2. Filter logic for the pack
  assert.match(content, /const supervisionPackReflections = computed/)
  assert.match(content, /reflections\.value\.filter\(r => r\.included_in_supervision\)/)

  // 3. Privacy warning
  assert.match(content, /Review and anonymise all material before sharing outside Helios/)

  // 4. Pack items
  assert.match(content, /v-for="reflection in supervisionPackReflections"/)
  assert.match(content, /View Details/)
  assert.match(content, /Remove/)

  // 5. Export preview modal
  assert.match(content, /exportPreviewOpen/)
  assert.match(content, /Export Preview/)
  assert.match(content, /includeClientNames/)

  // 6. Export privacy: default excluded client names, exclude UUIDs
  assert.match(content, /const includeClientNames = ref\(false\)/)
  // Ensure we don't accidentally include session_ref or client_id in the export preview by default
  assert.match(content, /v-if="includeClientNames && reflection\.clients\?\.display_name"/)
  
  // 7. Export actions: Copy and Print
  assert.match(content, /copyExportText/)
  assert.match(content, /printPack/)
  assert.match(content, /window\.print\(\)/)
  assert.match(content, /navigator\.clipboard\.writeText/)

  // 8. Print styles
  assert.match(content, /@media print/)
  assert.match(content, /\.no-print/)
  assert.match(content, /\.print-content/)
})
