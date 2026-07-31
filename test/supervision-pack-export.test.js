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

  // 2. Hub-and-Spoke structure and single heading
  assert.ok(!workspaceContent.includes('Supervision Workspace</h2>'), 'Workspace should not have duplicated internal heading')
  assert.match(workspaceContent, /<h1 class="text-h1 font-semibold text-ink">Supervision Workspace<\/h1>/)

  // 3. Preparation summary metrics (replacing progress percentage)
  assert.match(packViewContent, /Included/)
  assert.match(packViewContent, /Approximate length/)
  assert.match(packViewContent, /Preparation notes/)
  assert.ok(!packViewContent.includes('preparationProgress'), 'Percentage progress should be removed')
  assert.match(packViewContent, /{{ notesCount }} of {{ reflections\.length }} added/)

  // 4. Simplified reflection cards
  assert.match(packViewContent, /Remove from Supervision/)
  assert.ok(!packViewContent.includes('aria-label="Remove from Pack"'), 'Old trash button should be removed')
  assert.match(packViewContent, /Include in report/)

  // 5. Export preview modal (teleported to body)
  assert.match(workspaceContent, /<teleport to="body">/)
  assert.match(workspaceContent, /exportPreviewOpen/)
  assert.match(reportPreviewContent, /Supervision Report Preview/)
  assert.match(workspaceContent, /exportOptions/)

  // 6. Export privacy: default excluded client names
  assert.match(workspaceContent, /includeClientReferences: false/)
  // Ensure we use aliases when client names are excluded
  assert.match(workspaceContent, /exportOptions\.value\.includeClientReferences && r\.clients\?\.display_name/)
  
  // 7. Export actions: Copy and Print
  assert.match(workspaceContent, /copyExportText/)
  assert.match(workspaceContent, /printPack/)
  assert.match(workspaceContent, /window\.print/)
  assert.match(workspaceContent, /navigator\.clipboard\.writeText/)

  // 8. Print styles
  assert.match(reportPreviewContent, /@media print/)
  assert.match(reportPreviewContent, /\.no-print/)
})
