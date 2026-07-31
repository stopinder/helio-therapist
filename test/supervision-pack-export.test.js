import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Supervision Pack View and Export Flow', async () => {
  const workspaceContent = await readFile(new URL('../src/views/supervision/SupervisionWorkspace.vue', import.meta.url), 'utf8')
  const packViewContent = await readFile(new URL('../src/components/professional-development/SupervisionPackView.vue', import.meta.url), 'utf8')
  const reportPreviewContent = await readFile(new URL('../src/components/professional-development/SupervisionReportPreview.vue', import.meta.url), 'utf8')

  // 1. Pack items logic in workspace
  assert.match(workspaceContent, /const supervisionPackReflections = computed/)
  assert.match(workspaceContent, /props\.reflections\.filter\(r => r\.included_in_supervision\)/)

  // 2. Privacy warning
  assert.match(packViewContent, /Thoughtfully prepare for your next supervision session/)
  assert.match(packViewContent, /Review and anonymise your private reflections before generating a professional report/)
  assert.match(packViewContent, /Private preparation workspace/)

  // 3. Pack items
  assert.match(packViewContent, /v-for="reflection in group.items"/)
  assert.match(packViewContent, /Remove from Pack/)
  assert.match(packViewContent, /Open full detail/)
  assert.match(packViewContent, /Preparation Notes/)
  assert.match(packViewContent, /type="checkbox"/)
  assert.match(packViewContent, /toggle-report-selection/)

  // 4. Export preview modal
  assert.match(workspaceContent, /exportPreviewOpen/)
  assert.match(reportPreviewContent, /Supervision Report Preview/)
  assert.match(workspaceContent, /exportOptions/)

  // 5. Export privacy: default excluded client names
  assert.match(workspaceContent, /includeClientReferences: false/)
  // Ensure we use aliases when client names are excluded
  assert.match(workspaceContent, /exportOptions\.value\.includeClientReferences && r\.clients\?\.display_name/)
  
  // 6. Export actions: Copy and Print
  assert.match(workspaceContent, /copyExportText/)
  assert.match(workspaceContent, /printPack/)
  assert.match(workspaceContent, /window\.print/)
  assert.match(workspaceContent, /navigator\.clipboard\.writeText/)

  // 7. Print styles
  assert.match(reportPreviewContent, /@media print/)
  assert.match(reportPreviewContent, /\.no-print/)
})
