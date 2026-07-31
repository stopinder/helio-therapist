import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('Professional Development Hub-and-Spoke Navigation Architecture', () => {
  const layoutPath = join(process.cwd(), 'src/layouts/ProfessionalDevelopmentLayout.vue');
  const layoutContent = readFileSync(layoutPath, 'utf8');

  // 1. Verify absence of secondary sidebar (aside)
  assert.strictEqual(layoutContent.includes('<aside'), false, 'Layout should not contain an <aside> element (secondary sidebar)');
  
  // 2. Verify presence of back link logic
  assert.strictEqual(layoutContent.includes('isChildPage'), true, 'Layout should define isChildPage computed property');
  assert.strictEqual(layoutContent.includes('to="/supervision"'), true, 'Layout should contain a router-link back to /supervision');
  assert.strictEqual(layoutContent.includes('Professional Development'), true, 'Back link should have clear "Professional Development" text');

  // 3. Verify sticky header for child pages
  assert.strictEqual(layoutContent.includes('sticky top-0'), true, 'Child page header should be sticky');
});

test('Child Pages Header Consistency', () => {
  const views = [
    'SupervisionHome.vue',
    'SupervisionReflections.vue',
    'SupervisionWorkspace.vue',
    'SupervisionGrowth.vue',
    'SupervisionInsights.vue'
  ];

  views.forEach(view => {
    const viewPath = join(process.cwd(), 'src/views/supervision', view);
    const content = readFileSync(viewPath, 'utf8');
    
    // Every child page should have a header with Workspace badge
    assert.strictEqual(content.includes('<header'), true, `${view} should have its own <header>`);
    assert.strictEqual(content.includes('Workspace'), true, `${view} should include "Workspace" badge text`);
    
    // SupervisionHome (hub) should have "Professional Development" title
    if (view === 'SupervisionHome.vue') {
      assert.strictEqual(content.includes('Professional Development'), true, 'Home hub should have the main title');
    }
  });
});
