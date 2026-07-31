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
  assert.match(content, /The Supervision Pack is your private collection of material selected for supervision/)
  assert.match(content, /Review and anonymise it before creating a report/)
  assert.match(content, /Review and remove identifying information before sharing outside Helios/)

  // 4. Pack items
  assert.match(content, /v-for="reflection in group.items"/)
  assert.match(content, /View reflection/)
  assert.match(content, /Remove from Pack/)

  // 5. Export preview modal
  assert.match(content, /exportPreviewOpen/)
  assert.match(content, /Supervision Report Preview/)
  assert.match(content, /exportOptions/)

  // 6. Export privacy: default excluded client names, exclude UUIDs
  assert.match(content, /includeClientReferences: false/)
  // Ensure we use aliases when client names are excluded
  assert.match(content, /exportOptions\.value\.includeClientReferences && r\.clients\?\.display_name/)
  assert.match(content, /exportOptions\.includeClientReferences && reflection\.clients\?\.display_name \? reflection\.clients\.display_name : \(reflection\.clients\?\.display_name \? clientAliases\[reflection\.clients\.display_name\] : 'Anonymous'\)/)
  
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
