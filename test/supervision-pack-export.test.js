import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Supervision Pack View and Export Flow', async () => {
  const viewsContent = await readFile(new URL('../src/views/Supervision.vue', import.meta.url), 'utf8')
  const packViewContent = await readFile(new URL('../src/components/professional-development/SupervisionPackView.vue', import.meta.url), 'utf8')
  const reportPreviewContent = await readFile(new URL('../src/components/professional-development/SupervisionReportPreview.vue', import.meta.url), 'utf8')

  // 1. Third view added: Timeline, Insights, Pack
  assert.match(viewsContent, /activeView === 'pack'/)
  assert.match(viewsContent, /<button\s+@click="activeView = 'pack'"/)
  assert.match(viewsContent, /Pack/)

  // 2. Filter logic for the pack
  assert.match(viewsContent, /const supervisionPackReflections = computed/)
  assert.match(viewsContent, /reflections\.value\.filter\(r => r\.included_in_supervision\)/)

  // 3. Privacy warning
  assert.match(packViewContent, /The Supervision Pack is your private collection of material selected for supervision/)
  assert.match(packViewContent, /Review and anonymise it before creating a report/)
  assert.match(packViewContent, /Review and remove identifying information before sharing outside Helios/)

  // 4. Pack items
  assert.match(packViewContent, /v-for="reflection in group.items"/)
  assert.match(packViewContent, /Remove from Pack/)
  assert.match(packViewContent, /Open original reflection/)
  assert.match(packViewContent, /preparation/)
  assert.match(packViewContent, /type="checkbox"/)
  assert.match(packViewContent, /toggle-report-selection/)

  // 5. Export preview modal
  assert.match(viewsContent, /exportPreviewOpen/)
  assert.match(reportPreviewContent, /Supervision Report Preview/)
  assert.match(viewsContent, /exportOptions/)

  // 6. Export privacy: default excluded client names, exclude UUIDs
  assert.match(viewsContent, /includeClientReferences: false/)
  // Ensure we use aliases when client names are excluded
  assert.match(viewsContent, /exportOptions\.value\.includeClientReferences && r\.clients\?\.display_name/)
  
  // 7. Export actions: Copy and Print
  assert.match(viewsContent, /copyExportText/)
  assert.match(viewsContent, /printPack/)
  assert.match(viewsContent, /window\.print/)
  assert.match(viewsContent, /navigator\.clipboard\.writeText/)

  // 8. Print styles
  assert.match(reportPreviewContent, /@media print/)
  assert.match(reportPreviewContent, /\.no-print/)
})
